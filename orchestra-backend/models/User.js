import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email jest wymagany"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Nieprawidłowy format email",
      ],
    },

    name: {
      type: String,
      required: [true, "Imię i nazwisko jest wymagane"],
      trim: true,
      minlength: [2, "Imię i nazwisko musi mieć co najmniej 2 znaki"],
      maxlength: [100, "Imię i nazwisko nie może być dłuższe niż 100 znaków"],
    },

    password: {
      type: String,
      required: [true, "Hasło jest wymagane"],
      minlength: [6, "Hasło musi mieć co najmniej 6 znaków"],
    },

    role: {
      type: String,
      enum: ["conductor", "musician"],
      required: [true, "Rola użytkownika jest wymagana"],
    },

    instrument: {
      type: String,
      required: function () {
        return this.role === "musician";
      },
      trim: true,
    },

    isTemporaryPassword: {
      type: Boolean,
      default: false,
    },

    personalData: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        street: String,
        city: String,
        postalCode: String,
        country: {
          type: String,
          default: "Polska",
        },
      },
    },

    active: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "musician";
      },
    },

    lastLogin: {
      type: Date,
    },

    // Tracking ostatnich odwiedzin wydarzeń
    lastEventViews: [
      {
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Event",
        },
        lastViewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    emailVerified: {
      type: Boolean,
      default: false
    },

    emailVerificationToken: String,
    emailVerificationExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
  }
);

// Hash password przed zapisem
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isImporting) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metoda do porównywania haseł
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Metoda do generowania pełnego imienia
userSchema.virtual("fullName").get(function () {
  if (this.personalData?.firstName && this.personalData?.lastName) {
    return `${this.personalData.firstName} ${this.personalData.lastName}`;
  }
  return this.name;
});

// Metoda do generowania tokenu weryfikacji email
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 godziny
  return token;
};

// Metoda do generowania tokenu resetowania hasła
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 godzina
  return token;
};

export default mongoose.model("User", userSchema);

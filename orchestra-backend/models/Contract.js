import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  // === REFERENCJE ===
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  participationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participation',
    required: true,
    unique: true, // Każde uczestnictwo może mieć tylko jedną umowę
  },
  conductorId: { // Kto wygenerował umowę
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // === DANE ZAMAWIAJĄCEGO (MIGAWKA) ===
  zamawiajacy: {
    nazwa: { type: String, required: true },
    adres: { type: String, required: true },
    nip: { type: String, required: true },
    regon: { type: String },
    reprezentant: { type: String, required: true },
  },

  // === DANE WYKONAWCY (MIGAWKA) ===
  wykonawca: {
    imieNazwisko: { type: String, required: true },
    adres: { type: String, required: true },
    pesel: { type: String, required: true },
    numerKonta: { type: String, required: true },
  },
  
  // === DANE UMOWY ===
  numerUmowy: { type: String, required: true },
  miejsceZawarcia: { type: String, default: 'Kraków' },
  dataZawarcia: { type: Date, required: true },
  dataWykonaniaDziela: { type: Date, required: true },
  przedmiotUmowy: { type: String, required: true },
  
  // === DANE FINANSOWE (MIGAWKA) ===
  wynagrodzenieBrutto: { type: Number, required: true },
  kosztyUzyskaniaPrzychodu: { type: Number, required: true },
  podstawaOpodatkowania: { type: Number, required: true },
  zaliczkaNaPodatek: { type: Number, required: true },
  wynagrodzenieNetto: { type: Number, required: true },
  
  // === METADANE ===
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Automatyczna aktualizacja pola 'updatedAt' przy zapisie
contractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Contract = mongoose.model('Contract', contractSchema);

export default Contract; 
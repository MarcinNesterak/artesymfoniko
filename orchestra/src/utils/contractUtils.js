const 금액 = (num) => {
    const jednostki = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
    const nastki = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
    const dziesiatki = ['', 'dziesięć', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
    const setki = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];
    const grupy = [
        ['', '', ''],
        ['tysiąc', 'tysiące', 'tysięcy'],
        ['milion', 'miliony', 'milionów'],
        ['miliard', 'miliardy', 'miliardów'],
        ['bilion', 'biliony', 'bilionów'],
        ['biliard', 'biliardy', 'biliardów'],
        ['trylion', 'tryliony', 'trylionów'],
    ];

    let ret = '';
    let g = 0;
    while (num > 0) {
        let s = Math.floor((num % 1000) / 100);
        let n = 0;
        let d = Math.floor((num % 100) / 10);
        let j = Math.floor(num % 10);
        if (d === 1 && j > 0) {
            n = j;
            d = 0;
            j = 0;
        }

        let k = 2;
        if (j === 1 && s + d + n === 0) {
            k = 0;
        }
        if (j === 2 || j === 3 || j === 4) {
            k = 1;
        }

        if (s + d + n + j > 0) {
            ret = setki[s] + (s > 0 ? ' ' : '') + dziesiatki[d] + (d > 0 ? ' ' : '') + (n > 0 ? nastki[n] + ' ' : jednostki[j] + ' ') + grupy[g][k] + ' ' + ret;
        }

        g++;
        num = Math.floor(num / 1000);
    }
    return ret.trim();
};

export const amountToWords = (amount) => {
    if (typeof amount !== 'number' && typeof amount !== 'string') {
        return '';
    }
    const num = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num)) {
        return '';
    }

    const zl = Math.floor(num);
    const gr = Math.round((num - zl) * 100);

    const zlText = 금액(zl) || 'zero';
    const grText = 금액(gr) || 'zero';

    return `${zlText} złotych ${grText} groszy`;
}; 
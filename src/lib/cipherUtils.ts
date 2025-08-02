import { sbox, invSBox } from './sbox';

export function gmul(a: number, b: number): number {
    let p = 0;
    for (let i = 0; i < 8 && a; i++) {
        if (a & 1) p ^= b;
        const hiBitSet = b & 0x80;
        b <<= 1;
        if (hiBitSet) b ^= 0x11b;
        a >>= 1;
    }
    return p;
}

export function ShiftBits(byteinput: number, keybyte: number, shift: number, inv: boolean = false): number {
    let newbyte: number;

    if (!inv) {
        if (keybyte % 2 === 0)
            newbyte = ((byteinput << shift) | (byteinput >> (8 - shift))) & 0xFF;  // ✅ Mask to 8 bits
        else
            newbyte = ((byteinput >> shift) | (byteinput << (8 - shift))) & 0xFF;
    } else {
        if (keybyte % 2 === 0)
            newbyte = ((byteinput >> shift) | (byteinput << (8 - shift))) & 0xFF;
        else
            newbyte = ((byteinput << shift) | (byteinput >> (8 - shift))) & 0xFF;
    }

    return newbyte;
}




export function ShiftColumns(matrix: number[][], inv = false): number[][] {
    if (!inv) {

        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length - 1; j++) {
                const temp = matrix[i][j];
                matrix[i][j] = matrix[i][j + 1]
                matrix[i][j + 1] = temp;
            }
        }

    } else {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = matrix[i].length - 1; j > 0; j--) {
                const temp = matrix[i][j];
                matrix[i][j] = matrix[i][j - 1]
                matrix[i][j - 1] = temp;
            }
        }
    }
    return matrix;
}

export function SubBytes(byte: number, inv = false): number {
    if (!inv) return sbox[byte];
    else return invSBox[byte];
}

export function MixColumns(state: number[][], miningConstants: number[][], key: number[][], inv = false): number[][] {
    let temp = Array.from({ length: 4 }, () => Array(4).fill(0x00));
    if (inv)
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                state[i][j] = state[i][j] ^ key[i][3 - j];
    state = structuredClone(ShiftColumns(state, inv));
    for (let c = 0; c < 4; c++) {
        for (let i = 0; i < 4; i++) {
            temp[i][c] = gmul(state[0][c], miningConstants[i][0]) ^ gmul(state[1][c], miningConstants[i][1]) ^ gmul(state[2][c], miningConstants[i][2]) ^ gmul(state[3][c], miningConstants[i][3]);
        }
    }
    temp = structuredClone(ShiftColumns(temp, inv));
    const tempCopy = temp.map(row => [...row]);
    if (!inv)
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                state[i][j] = (tempCopy[i][j] ^ key[i][3 - j]) & 0xFF;   // ✅ XOR + 8-bit masking
    else
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            state[i][j] = tempCopy[i][j]
return state;
}

export function KeyExpansion(matrixKey: number[][]): number[][] {
    const temp = matrixKey[0][3];
    matrixKey[0][3] = matrixKey[1][3];
    matrixKey[1][3] = matrixKey[2][3];
    matrixKey[2][3] = matrixKey[3][3];
    matrixKey[3][3] = temp;


    matrixKey[0][0] = matrixKey[0][3] ^ matrixKey[0][0];
    matrixKey[1][0] = matrixKey[1][3] ^ matrixKey[1][0];
    matrixKey[2][0] = matrixKey[2][3] ^ matrixKey[2][0];
    matrixKey[3][0] = matrixKey[3][3] ^ matrixKey[3][0];


    matrixKey[0][1] = matrixKey[0][0] ^ SubBytes(matrixKey[0][0]);
    matrixKey[1][1] = matrixKey[1][0] ^ SubBytes(matrixKey[1][0]);
    matrixKey[2][1] = matrixKey[2][0] ^ SubBytes(matrixKey[2][0]);
    matrixKey[3][1] = matrixKey[3][0] ^ SubBytes(matrixKey[3][0]);

    matrixKey[0][2] = matrixKey[0][1] ^ SubBytes(matrixKey[0][1]);
    matrixKey[1][2] = matrixKey[1][1] ^ SubBytes(matrixKey[1][1]);
    matrixKey[2][2] = matrixKey[2][1] ^ SubBytes(matrixKey[2][1]);
    matrixKey[3][2] = matrixKey[3][1] ^ SubBytes(matrixKey[3][1]);


    matrixKey[0][3] = matrixKey[0][2] ^ (SubBytes(matrixKey[0][0]) ^ matrixKey[0][0]);
    matrixKey[1][3] = matrixKey[1][2] ^ (SubBytes(matrixKey[1][0]) ^ matrixKey[1][0]);
    matrixKey[2][3] = matrixKey[2][2] ^ (SubBytes(matrixKey[2][0]) ^ matrixKey[2][0]);
    matrixKey[3][3] = matrixKey[3][2] ^ (SubBytes(matrixKey[3][0]) ^ matrixKey[3][0]);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            matrixKey[i][j] = SubBytes(matrixKey[i][j]);
        }
    }
    return matrixKey;
}

export function SwapBytes(state: number[][], key: number[][], inv = false): number[][] {
    if (!inv) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const firstIndex = (key[i][j] & 0xF0) >> 4;
                const secondIndex = key[i][j] & 0x0F;
                const row1 = Math.floor(firstIndex / 4);
                const col1 = firstIndex % 4;
                const row2 = Math.floor(secondIndex / 4);
                const col2 = secondIndex % 4;
                [state[row1][col1], state[row2][col2]] = [state[row2][col2], state[row1][col1]];
            }
        }
    } else {
        for (let i = 3; i >= 0; i--) {
            for (let j = 3; j >= 0; j--) {
                const firstIndex = (key[i][j] & 0xF0) >> 4;
                const secondIndex = key[i][j] & 0x0F;
                const row1 = Math.floor(firstIndex / 4);
                const col1 = firstIndex % 4;
                const row2 = Math.floor(secondIndex / 4);
                const col2 = secondIndex % 4;
                [state[row1][col1], state[row2][col2]] = [state[row2][col2], state[row1][col1]];
            }
        }
    }
    return state;
}


export function printMatrix(matrix: number[][]) {
    for (const row of matrix) {
        console.log(row.map(byte => byte.toString(16).padStart(2, '0')).join(' '));
    }
}
import { ShiftBits, SubBytes, MixColumns, KeyExpansion, SwapBytes } from './cipherUtils';

export function encript(text: string, key: string) {
    if (key.length !== 32) {
        console.log('Key must be 32 characters');
        return;
    }
    const hextext = text.split('').map(char => char.charCodeAt(0));

    const matrixKey = Array.from({ length: 1 }, () => Array.from({ length: 4 }, () => Array(4).fill(0x00)));


    for (let i = 0, forMatrix = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++, forMatrix += 2) {
            const byteString = key.substr(forMatrix, 2);
            const byte = parseInt(byteString, 16);
            matrixKey[0][i][j] = byte;
        }
    }


    for (let round = 1; round < 6; round++) {
        matrixKey[round] = structuredClone(KeyExpansion(matrixKey[round - 1])); // ✅ Deep copy each new round key
    }

    let ciphertext = '';

    for (let block = 0; block < hextext.length; block += 16) {
        let matrix = Array.from({ length: 4 }, () => Array(4).fill(0x00));
        
        for (let u = block, i = 0, j = 0; u < hextext.length && u < block + 16; u++) {
            if (j === 4) {
                i++;
                j = 0;
            }
            matrix[i][j] = hextext[u];
            j++;
        }
        let round = 5;
        while (round--) {
            const mixingConstants = [
                [0x02, 0x03, 0x01, 0x01],
                [0x01, 0x02, 0x03, 0x01],
                [0x01, 0x01, 0x02, 0x03],
                [0x03, 0x01, 0x01, 0x02]
            ];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const shifted = ShiftBits(matrix[i][j], matrixKey[4 - round][i][j], (i * 4 + j) % 8);
                    const subbed = SubBytes(shifted);
                    matrix[i][j] = subbed;
                }
            }
            

            matrix = MixColumns(matrix, mixingConstants, matrixKey[4 - round]);
            
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    matrix[i][j] ^= matrixKey[4 - round][i][j];
                }
            }

            matrix = SwapBytes(matrix, matrixKey[4 - round]);
            
        }

        let ss = '';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                ss += matrix[i][j].toString(16).padStart(2, '0');
            }
        }
        ciphertext += ss;
    }

    //console.log('Your ciphertext is ' + ciphertext);
    return ciphertext
}
export function decript(ciphertext: string, key: string) {

    let plaintext = '';
    const matrixKey = Array.from({ length: 1 }, () => Array.from({ length: 4 }, () => Array(4).fill(0x00)));
    for (let i = 0, forMatrix = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++, forMatrix += 2) {
            const byteString = key.substr(forMatrix, 2);
            const byte = parseInt(byteString, 16);
            matrixKey[0][i][j] = byte;
        }
    }


    for (let round = 1; round < 6; round++) {
        matrixKey[round] = structuredClone(KeyExpansion(matrixKey[round - 1])); // ✅ Deep copy each new round key
    }
    for (let block = 0; block < ciphertext.length; block += 32) {
        let matrix = Array.from({ length: 4 }, () => Array(4).fill(0x00));

        for (let u = block, i = 0, j = 0; u < ciphertext.length && u < block + 32; u += 2) {
            if (j === 4) {
                i++;
                j = 0;
            }
            const byteString = ciphertext.substr(u, 2);
            const byte = parseInt(byteString, 16);
            matrix[i][j] = byte;
            j++;
        }

        let round = 5;
        while (round--) {
            const invMixingConstants = [
                [0x0e, 0x0b, 0x0d, 0x09],
                [0x09, 0x0e, 0x0b, 0x0d],
                [0x0d, 0x09, 0x0e, 0x0b],
                [0x0b, 0x0d, 0x09, 0x0e]
            ];
            // 🔹 Fixing Decryption Order
            
            matrix = SwapBytes(matrix, matrixKey[round], true);
            
            
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    matrix[i][j] ^= matrixKey[round][i][j];
                }
            }
            matrix = MixColumns(matrix, invMixingConstants, matrixKey[round], true);
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const subbed = SubBytes(matrix[i][j], true);
                    const shifted = ShiftBits(subbed, matrixKey[round][i][j], (i * 4 + j) % 8, true);
                    matrix[i][j] = shifted;
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                plaintext += String.fromCharCode(matrix[i][j]);
            }
        }
    }

    //console.log('Your plaintext is ' + plaintext);
    return plaintext;
}

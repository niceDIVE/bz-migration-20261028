/* =====================================================
 * BZ OFFLINE PATCH  build=2026-10-21T17:43:01.106Z
 * layer=BOOTSTRAP（薄引导；策略层见 hotfix/live/handlers.js）
 * 挂载方式：放入客户端可写目录 hotfix/jsb-adapter/jsb-engine.js
 * ===================================================== */
// ---- vendor: aes-js ----
;(function(){ var module, exports, angular, define;try{ if (typeof aesjs !== "undefined" && window) window.aesjs = aesjs; }catch(e){}
/*! MIT License. Copyright 2015-2018 Richard Moore <me@ricmoo.com>. See LICENSE.txt. */
(function(root) {
    "use strict";

    function checkInt(value) {
        return (parseInt(value) === value);
    }

    function checkInts(arrayish) {
        if (!checkInt(arrayish.length)) { return false; }

        for (var i = 0; i < arrayish.length; i++) {
            if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
                return false;
            }
        }

        return true;
    }

    function coerceArray(arg, copy) {

        // ArrayBuffer view
        if (arg.buffer && arg.name === 'Uint8Array') {

            if (copy) {
                if (arg.slice) {
                    arg = arg.slice();
                } else {
                    arg = Array.prototype.slice.call(arg);
                }
            }

            return arg;
        }

        // It's an array; check it is a valid representation of a byte
        if (Array.isArray(arg)) {
            if (!checkInts(arg)) {
                throw new Error('Array contains invalid value: ' + arg);
            }

            return new Uint8Array(arg);
        }

        // Something else, but behaves like an array (maybe a Buffer? Arguments?)
        if (checkInt(arg.length) && checkInts(arg)) {
            return new Uint8Array(arg);
        }

        throw new Error('unsupported array-like object');
    }

    function createArray(length) {
        return new Uint8Array(length);
    }

    function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
        if (sourceStart != null || sourceEnd != null) {
            if (sourceArray.slice) {
                sourceArray = sourceArray.slice(sourceStart, sourceEnd);
            } else {
                sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd);
            }
        }
        targetArray.set(sourceArray, targetStart);
    }



    var convertUtf8 = (function() {
        function toBytes(text) {
            var result = [], i = 0;
            text = encodeURI(text);
            while (i < text.length) {
                var c = text.charCodeAt(i++);

                // if it is a % sign, encode the following 2 bytes as a hex value
                if (c === 37) {
                    result.push(parseInt(text.substr(i, 2), 16))
                    i += 2;

                // otherwise, just the actual byte
                } else {
                    result.push(c)
                }
            }

            return coerceArray(result);
        }

        function fromBytes(bytes) {
            var result = [], i = 0;

            while (i < bytes.length) {
                var c = bytes[i];

                if (c < 128) {
                    result.push(String.fromCharCode(c));
                    i++;
                } else if (c > 191 && c < 224) {
                    result.push(String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f)));
                    i += 2;
                } else {
                    result.push(String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)));
                    i += 3;
                }
            }

            return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();

    var convertHex = (function() {
        function toBytes(text) {
            var result = [];
            for (var i = 0; i < text.length; i += 2) {
                result.push(parseInt(text.substr(i, 2), 16));
            }

            return result;
        }

        // http://ixti.net/development/javascript/2011/11/11/base64-encodedecode-of-utf8-in-browser-with-js.html
        var Hex = '0123456789abcdef';

        function fromBytes(bytes) {
                var result = [];
                for (var i = 0; i < bytes.length; i++) {
                    var v = bytes[i];
                    result.push(Hex[(v & 0xf0) >> 4] + Hex[v & 0x0f]);
                }
                return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();


    // Number of rounds by keysize
    var numberOfRounds = {16: 10, 24: 12, 32: 14}

    // Round constant words
    var rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91];

    // S-box and Inverse S-box (S is for Substitution)
    var S = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16];
    var Si =[0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d];

    // Transformations for encryption
    var T1 = [0xc66363a5, 0xf87c7c84, 0xee777799, 0xf67b7b8d, 0xfff2f20d, 0xd66b6bbd, 0xde6f6fb1, 0x91c5c554, 0x60303050, 0x02010103, 0xce6767a9, 0x562b2b7d, 0xe7fefe19, 0xb5d7d762, 0x4dababe6, 0xec76769a, 0x8fcaca45, 0x1f82829d, 0x89c9c940, 0xfa7d7d87, 0xeffafa15, 0xb25959eb, 0x8e4747c9, 0xfbf0f00b, 0x41adadec, 0xb3d4d467, 0x5fa2a2fd, 0x45afafea, 0x239c9cbf, 0x53a4a4f7, 0xe4727296, 0x9bc0c05b, 0x75b7b7c2, 0xe1fdfd1c, 0x3d9393ae, 0x4c26266a, 0x6c36365a, 0x7e3f3f41, 0xf5f7f702, 0x83cccc4f, 0x6834345c, 0x51a5a5f4, 0xd1e5e534, 0xf9f1f108, 0xe2717193, 0xabd8d873, 0x62313153, 0x2a15153f, 0x0804040c, 0x95c7c752, 0x46232365, 0x9dc3c35e, 0x30181828, 0x379696a1, 0x0a05050f, 0x2f9a9ab5, 0x0e070709, 0x24121236, 0x1b80809b, 0xdfe2e23d, 0xcdebeb26, 0x4e272769, 0x7fb2b2cd, 0xea75759f, 0x1209091b, 0x1d83839e, 0x582c2c74, 0x341a1a2e, 0x361b1b2d, 0xdc6e6eb2, 0xb45a5aee, 0x5ba0a0fb, 0xa45252f6, 0x763b3b4d, 0xb7d6d661, 0x7db3b3ce, 0x5229297b, 0xdde3e33e, 0x5e2f2f71, 0x13848497, 0xa65353f5, 0xb9d1d168, 0x00000000, 0xc1eded2c, 0x40202060, 0xe3fcfc1f, 0x79b1b1c8, 0xb65b5bed, 0xd46a6abe, 0x8dcbcb46, 0x67bebed9, 0x7239394b, 0x944a4ade, 0x984c4cd4, 0xb05858e8, 0x85cfcf4a, 0xbbd0d06b, 0xc5efef2a, 0x4faaaae5, 0xedfbfb16, 0x864343c5, 0x9a4d4dd7, 0x66333355, 0x11858594, 0x8a4545cf, 0xe9f9f910, 0x04020206, 0xfe7f7f81, 0xa05050f0, 0x783c3c44, 0x259f9fba, 0x4ba8a8e3, 0xa25151f3, 0x5da3a3fe, 0x804040c0, 0x058f8f8a, 0x3f9292ad, 0x219d9dbc, 0x70383848, 0xf1f5f504, 0x63bcbcdf, 0x77b6b6c1, 0xafdada75, 0x42212163, 0x20101030, 0xe5ffff1a, 0xfdf3f30e, 0xbfd2d26d, 0x81cdcd4c, 0x180c0c14, 0x26131335, 0xc3ecec2f, 0xbe5f5fe1, 0x359797a2, 0x884444cc, 0x2e171739, 0x93c4c457, 0x55a7a7f2, 0xfc7e7e82, 0x7a3d3d47, 0xc86464ac, 0xba5d5de7, 0x3219192b, 0xe6737395, 0xc06060a0, 0x19818198, 0x9e4f4fd1, 0xa3dcdc7f, 0x44222266, 0x542a2a7e, 0x3b9090ab, 0x0b888883, 0x8c4646ca, 0xc7eeee29, 0x6bb8b8d3, 0x2814143c, 0xa7dede79, 0xbc5e5ee2, 0x160b0b1d, 0xaddbdb76, 0xdbe0e03b, 0x64323256, 0x743a3a4e, 0x140a0a1e, 0x924949db, 0x0c06060a, 0x4824246c, 0xb85c5ce4, 0x9fc2c25d, 0xbdd3d36e, 0x43acacef, 0xc46262a6, 0x399191a8, 0x319595a4, 0xd3e4e437, 0xf279798b, 0xd5e7e732, 0x8bc8c843, 0x6e373759, 0xda6d6db7, 0x018d8d8c, 0xb1d5d564, 0x9c4e4ed2, 0x49a9a9e0, 0xd86c6cb4, 0xac5656fa, 0xf3f4f407, 0xcfeaea25, 0xca6565af, 0xf47a7a8e, 0x47aeaee9, 0x10080818, 0x6fbabad5, 0xf0787888, 0x4a25256f, 0x5c2e2e72, 0x381c1c24, 0x57a6a6f1, 0x73b4b4c7, 0x97c6c651, 0xcbe8e823, 0xa1dddd7c, 0xe874749c, 0x3e1f1f21, 0x964b4bdd, 0x61bdbddc, 0x0d8b8b86, 0x0f8a8a85, 0xe0707090, 0x7c3e3e42, 0x71b5b5c4, 0xcc6666aa, 0x904848d8, 0x06030305, 0xf7f6f601, 0x1c0e0e12, 0xc26161a3, 0x6a35355f, 0xae5757f9, 0x69b9b9d0, 0x17868691, 0x99c1c158, 0x3a1d1d27, 0x279e9eb9, 0xd9e1e138, 0xebf8f813, 0x2b9898b3, 0x22111133, 0xd26969bb, 0xa9d9d970, 0x078e8e89, 0x339494a7, 0x2d9b9bb6, 0x3c1e1e22, 0x15878792, 0xc9e9e920, 0x87cece49, 0xaa5555ff, 0x50282878, 0xa5dfdf7a, 0x038c8c8f, 0x59a1a1f8, 0x09898980, 0x1a0d0d17, 0x65bfbfda, 0xd7e6e631, 0x844242c6, 0xd06868b8, 0x824141c3, 0x299999b0, 0x5a2d2d77, 0x1e0f0f11, 0x7bb0b0cb, 0xa85454fc, 0x6dbbbbd6, 0x2c16163a];
    var T2 = [0xa5c66363, 0x84f87c7c, 0x99ee7777, 0x8df67b7b, 0x0dfff2f2, 0xbdd66b6b, 0xb1de6f6f, 0x5491c5c5, 0x50603030, 0x03020101, 0xa9ce6767, 0x7d562b2b, 0x19e7fefe, 0x62b5d7d7, 0xe64dabab, 0x9aec7676, 0x458fcaca, 0x9d1f8282, 0x4089c9c9, 0x87fa7d7d, 0x15effafa, 0xebb25959, 0xc98e4747, 0x0bfbf0f0, 0xec41adad, 0x67b3d4d4, 0xfd5fa2a2, 0xea45afaf, 0xbf239c9c, 0xf753a4a4, 0x96e47272, 0x5b9bc0c0, 0xc275b7b7, 0x1ce1fdfd, 0xae3d9393, 0x6a4c2626, 0x5a6c3636, 0x417e3f3f, 0x02f5f7f7, 0x4f83cccc, 0x5c683434, 0xf451a5a5, 0x34d1e5e5, 0x08f9f1f1, 0x93e27171, 0x73abd8d8, 0x53623131, 0x3f2a1515, 0x0c080404, 0x5295c7c7, 0x65462323, 0x5e9dc3c3, 0x28301818, 0xa1379696, 0x0f0a0505, 0xb52f9a9a, 0x090e0707, 0x36241212, 0x9b1b8080, 0x3ddfe2e2, 0x26cdebeb, 0x694e2727, 0xcd7fb2b2, 0x9fea7575, 0x1b120909, 0x9e1d8383, 0x74582c2c, 0x2e341a1a, 0x2d361b1b, 0xb2dc6e6e, 0xeeb45a5a, 0xfb5ba0a0, 0xf6a45252, 0x4d763b3b, 0x61b7d6d6, 0xce7db3b3, 0x7b522929, 0x3edde3e3, 0x715e2f2f, 0x97138484, 0xf5a65353, 0x68b9d1d1, 0x00000000, 0x2cc1eded, 0x60402020, 0x1fe3fcfc, 0xc879b1b1, 0xedb65b5b, 0xbed46a6a, 0x468dcbcb, 0xd967bebe, 0x4b723939, 0xde944a4a, 0xd4984c4c, 0xe8b05858, 0x4a85cfcf, 0x6bbbd0d0, 0x2ac5efef, 0xe54faaaa, 0x16edfbfb, 0xc5864343, 0xd79a4d4d, 0x55663333, 0x94118585, 0xcf8a4545, 0x10e9f9f9, 0x06040202, 0x81fe7f7f, 0xf0a05050, 0x44783c3c, 0xba259f9f, 0xe34ba8a8, 0xf3a25151, 0xfe5da3a3, 0xc0804040, 0x8a058f8f, 0xad3f9292, 0xbc219d9d, 0x48703838, 0x04f1f5f5, 0xdf63bcbc, 0xc177b6b6, 0x75afdada, 0x63422121, 0x30201010, 0x1ae5ffff, 0x0efdf3f3, 0x6dbfd2d2, 0x4c81cdcd, 0x14180c0c, 0x35261313, 0x2fc3ecec, 0xe1be5f5f, 0xa2359797, 0xcc884444, 0x392e1717, 0x5793c4c4, 0xf255a7a7, 0x82fc7e7e, 0x477a3d3d, 0xacc86464, 0xe7ba5d5d, 0x2b321919, 0x95e67373, 0xa0c06060, 0x98198181, 0xd19e4f4f, 0x7fa3dcdc, 0x66442222, 0x7e542a2a, 0xab3b9090, 0x830b8888, 0xca8c4646, 0x29c7eeee, 0xd36bb8b8, 0x3c281414, 0x79a7dede, 0xe2bc5e5e, 0x1d160b0b, 0x76addbdb, 0x3bdbe0e0, 0x56643232, 0x4e743a3a, 0x1e140a0a, 0xdb924949, 0x0a0c0606, 0x6c482424, 0xe4b85c5c, 0x5d9fc2c2, 0x6ebdd3d3, 0xef43acac, 0xa6c46262, 0xa8399191, 0xa4319595, 0x37d3e4e4, 0x8bf27979, 0x32d5e7e7, 0x438bc8c8, 0x596e3737, 0xb7da6d6d, 0x8c018d8d, 0x64b1d5d5, 0xd29c4e4e, 0xe049a9a9, 0xb4d86c6c, 0xfaac5656, 0x07f3f4f4, 0x25cfeaea, 0xafca6565, 0x8ef47a7a, 0xe947aeae, 0x18100808, 0xd56fbaba, 0x88f07878, 0x6f4a2525, 0x725c2e2e, 0x24381c1c, 0xf157a6a6, 0xc773b4b4, 0x5197c6c6, 0x23cbe8e8, 0x7ca1dddd, 0x9ce87474, 0x213e1f1f, 0xdd964b4b, 0xdc61bdbd, 0x860d8b8b, 0x850f8a8a, 0x90e07070, 0x427c3e3e, 0xc471b5b5, 0xaacc6666, 0xd8904848, 0x05060303, 0x01f7f6f6, 0x121c0e0e, 0xa3c26161, 0x5f6a3535, 0xf9ae5757, 0xd069b9b9, 0x91178686, 0x5899c1c1, 0x273a1d1d, 0xb9279e9e, 0x38d9e1e1, 0x13ebf8f8, 0xb32b9898, 0x33221111, 0xbbd26969, 0x70a9d9d9, 0x89078e8e, 0xa7339494, 0xb62d9b9b, 0x223c1e1e, 0x92158787, 0x20c9e9e9, 0x4987cece, 0xffaa5555, 0x78502828, 0x7aa5dfdf, 0x8f038c8c, 0xf859a1a1, 0x80098989, 0x171a0d0d, 0xda65bfbf, 0x31d7e6e6, 0xc6844242, 0xb8d06868, 0xc3824141, 0xb0299999, 0x775a2d2d, 0x111e0f0f, 0xcb7bb0b0, 0xfca85454, 0xd66dbbbb, 0x3a2c1616];
    var T3 = [0x63a5c663, 0x7c84f87c, 0x7799ee77, 0x7b8df67b, 0xf20dfff2, 0x6bbdd66b, 0x6fb1de6f, 0xc55491c5, 0x30506030, 0x01030201, 0x67a9ce67, 0x2b7d562b, 0xfe19e7fe, 0xd762b5d7, 0xabe64dab, 0x769aec76, 0xca458fca, 0x829d1f82, 0xc94089c9, 0x7d87fa7d, 0xfa15effa, 0x59ebb259, 0x47c98e47, 0xf00bfbf0, 0xadec41ad, 0xd467b3d4, 0xa2fd5fa2, 0xafea45af, 0x9cbf239c, 0xa4f753a4, 0x7296e472, 0xc05b9bc0, 0xb7c275b7, 0xfd1ce1fd, 0x93ae3d93, 0x266a4c26, 0x365a6c36, 0x3f417e3f, 0xf702f5f7, 0xcc4f83cc, 0x345c6834, 0xa5f451a5, 0xe534d1e5, 0xf108f9f1, 0x7193e271, 0xd873abd8, 0x31536231, 0x153f2a15, 0x040c0804, 0xc75295c7, 0x23654623, 0xc35e9dc3, 0x18283018, 0x96a13796, 0x050f0a05, 0x9ab52f9a, 0x07090e07, 0x12362412, 0x809b1b80, 0xe23ddfe2, 0xeb26cdeb, 0x27694e27, 0xb2cd7fb2, 0x759fea75, 0x091b1209, 0x839e1d83, 0x2c74582c, 0x1a2e341a, 0x1b2d361b, 0x6eb2dc6e, 0x5aeeb45a, 0xa0fb5ba0, 0x52f6a452, 0x3b4d763b, 0xd661b7d6, 0xb3ce7db3, 0x297b5229, 0xe33edde3, 0x2f715e2f, 0x84971384, 0x53f5a653, 0xd168b9d1, 0x00000000, 0xed2cc1ed, 0x20604020, 0xfc1fe3fc, 0xb1c879b1, 0x5bedb65b, 0x6abed46a, 0xcb468dcb, 0xbed967be, 0x394b7239, 0x4ade944a, 0x4cd4984c, 0x58e8b058, 0xcf4a85cf, 0xd06bbbd0, 0xef2ac5ef, 0xaae54faa, 0xfb16edfb, 0x43c58643, 0x4dd79a4d, 0x33556633, 0x85941185, 0x45cf8a45, 0xf910e9f9, 0x02060402, 0x7f81fe7f, 0x50f0a050, 0x3c44783c, 0x9fba259f, 0xa8e34ba8, 0x51f3a251, 0xa3fe5da3, 0x40c08040, 0x8f8a058f, 0x92ad3f92, 0x9dbc219d, 0x38487038, 0xf504f1f5, 0xbcdf63bc, 0xb6c177b6, 0xda75afda, 0x21634221, 0x10302010, 0xff1ae5ff, 0xf30efdf3, 0xd26dbfd2, 0xcd4c81cd, 0x0c14180c, 0x13352613, 0xec2fc3ec, 0x5fe1be5f, 0x97a23597, 0x44cc8844, 0x17392e17, 0xc45793c4, 0xa7f255a7, 0x7e82fc7e, 0x3d477a3d, 0x64acc864, 0x5de7ba5d, 0x192b3219, 0x7395e673, 0x60a0c060, 0x81981981, 0x4fd19e4f, 0xdc7fa3dc, 0x22664422, 0x2a7e542a, 0x90ab3b90, 0x88830b88, 0x46ca8c46, 0xee29c7ee, 0xb8d36bb8, 0x143c2814, 0xde79a7de, 0x5ee2bc5e, 0x0b1d160b, 0xdb76addb, 0xe03bdbe0, 0x32566432, 0x3a4e743a, 0x0a1e140a, 0x49db9249, 0x060a0c06, 0x246c4824, 0x5ce4b85c, 0xc25d9fc2, 0xd36ebdd3, 0xacef43ac, 0x62a6c462, 0x91a83991, 0x95a43195, 0xe437d3e4, 0x798bf279, 0xe732d5e7, 0xc8438bc8, 0x37596e37, 0x6db7da6d, 0x8d8c018d, 0xd564b1d5, 0x4ed29c4e, 0xa9e049a9, 0x6cb4d86c, 0x56faac56, 0xf407f3f4, 0xea25cfea, 0x65afca65, 0x7a8ef47a, 0xaee947ae, 0x08181008, 0xbad56fba, 0x7888f078, 0x256f4a25, 0x2e725c2e, 0x1c24381c, 0xa6f157a6, 0xb4c773b4, 0xc65197c6, 0xe823cbe8, 0xdd7ca1dd, 0x749ce874, 0x1f213e1f, 0x4bdd964b, 0xbddc61bd, 0x8b860d8b, 0x8a850f8a, 0x7090e070, 0x3e427c3e, 0xb5c471b5, 0x66aacc66, 0x48d89048, 0x03050603, 0xf601f7f6, 0x0e121c0e, 0x61a3c261, 0x355f6a35, 0x57f9ae57, 0xb9d069b9, 0x86911786, 0xc15899c1, 0x1d273a1d, 0x9eb9279e, 0xe138d9e1, 0xf813ebf8, 0x98b32b98, 0x11332211, 0x69bbd269, 0xd970a9d9, 0x8e89078e, 0x94a73394, 0x9bb62d9b, 0x1e223c1e, 0x87921587, 0xe920c9e9, 0xce4987ce, 0x55ffaa55, 0x28785028, 0xdf7aa5df, 0x8c8f038c, 0xa1f859a1, 0x89800989, 0x0d171a0d, 0xbfda65bf, 0xe631d7e6, 0x42c68442, 0x68b8d068, 0x41c38241, 0x99b02999, 0x2d775a2d, 0x0f111e0f, 0xb0cb7bb0, 0x54fca854, 0xbbd66dbb, 0x163a2c16];
    var T4 = [0x6363a5c6, 0x7c7c84f8, 0x777799ee, 0x7b7b8df6, 0xf2f20dff, 0x6b6bbdd6, 0x6f6fb1de, 0xc5c55491, 0x30305060, 0x01010302, 0x6767a9ce, 0x2b2b7d56, 0xfefe19e7, 0xd7d762b5, 0xababe64d, 0x76769aec, 0xcaca458f, 0x82829d1f, 0xc9c94089, 0x7d7d87fa, 0xfafa15ef, 0x5959ebb2, 0x4747c98e, 0xf0f00bfb, 0xadadec41, 0xd4d467b3, 0xa2a2fd5f, 0xafafea45, 0x9c9cbf23, 0xa4a4f753, 0x727296e4, 0xc0c05b9b, 0xb7b7c275, 0xfdfd1ce1, 0x9393ae3d, 0x26266a4c, 0x36365a6c, 0x3f3f417e, 0xf7f702f5, 0xcccc4f83, 0x34345c68, 0xa5a5f451, 0xe5e534d1, 0xf1f108f9, 0x717193e2, 0xd8d873ab, 0x31315362, 0x15153f2a, 0x04040c08, 0xc7c75295, 0x23236546, 0xc3c35e9d, 0x18182830, 0x9696a137, 0x05050f0a, 0x9a9ab52f, 0x0707090e, 0x12123624, 0x80809b1b, 0xe2e23ddf, 0xebeb26cd, 0x2727694e, 0xb2b2cd7f, 0x75759fea, 0x09091b12, 0x83839e1d, 0x2c2c7458, 0x1a1a2e34, 0x1b1b2d36, 0x6e6eb2dc, 0x5a5aeeb4, 0xa0a0fb5b, 0x5252f6a4, 0x3b3b4d76, 0xd6d661b7, 0xb3b3ce7d, 0x29297b52, 0xe3e33edd, 0x2f2f715e, 0x84849713, 0x5353f5a6, 0xd1d168b9, 0x00000000, 0xeded2cc1, 0x20206040, 0xfcfc1fe3, 0xb1b1c879, 0x5b5bedb6, 0x6a6abed4, 0xcbcb468d, 0xbebed967, 0x39394b72, 0x4a4ade94, 0x4c4cd498, 0x5858e8b0, 0xcfcf4a85, 0xd0d06bbb, 0xefef2ac5, 0xaaaae54f, 0xfbfb16ed, 0x4343c586, 0x4d4dd79a, 0x33335566, 0x85859411, 0x4545cf8a, 0xf9f910e9, 0x02020604, 0x7f7f81fe, 0x5050f0a0, 0x3c3c4478, 0x9f9fba25, 0xa8a8e34b, 0x5151f3a2, 0xa3a3fe5d, 0x4040c080, 0x8f8f8a05, 0x9292ad3f, 0x9d9dbc21, 0x38384870, 0xf5f504f1, 0xbcbcdf63, 0xb6b6c177, 0xdada75af, 0x21216342, 0x10103020, 0xffff1ae5, 0xf3f30efd, 0xd2d26dbf, 0xcdcd4c81, 0x0c0c1418, 0x13133526, 0xecec2fc3, 0x5f5fe1be, 0x9797a235, 0x4444cc88, 0x1717392e, 0xc4c45793, 0xa7a7f255, 0x7e7e82fc, 0x3d3d477a, 0x6464acc8, 0x5d5de7ba, 0x19192b32, 0x737395e6, 0x6060a0c0, 0x81819819, 0x4f4fd19e, 0xdcdc7fa3, 0x22226644, 0x2a2a7e54, 0x9090ab3b, 0x8888830b, 0x4646ca8c, 0xeeee29c7, 0xb8b8d36b, 0x14143c28, 0xdede79a7, 0x5e5ee2bc, 0x0b0b1d16, 0xdbdb76ad, 0xe0e03bdb, 0x32325664, 0x3a3a4e74, 0x0a0a1e14, 0x4949db92, 0x06060a0c, 0x24246c48, 0x5c5ce4b8, 0xc2c25d9f, 0xd3d36ebd, 0xacacef43, 0x6262a6c4, 0x9191a839, 0x9595a431, 0xe4e437d3, 0x79798bf2, 0xe7e732d5, 0xc8c8438b, 0x3737596e, 0x6d6db7da, 0x8d8d8c01, 0xd5d564b1, 0x4e4ed29c, 0xa9a9e049, 0x6c6cb4d8, 0x5656faac, 0xf4f407f3, 0xeaea25cf, 0x6565afca, 0x7a7a8ef4, 0xaeaee947, 0x08081810, 0xbabad56f, 0x787888f0, 0x25256f4a, 0x2e2e725c, 0x1c1c2438, 0xa6a6f157, 0xb4b4c773, 0xc6c65197, 0xe8e823cb, 0xdddd7ca1, 0x74749ce8, 0x1f1f213e, 0x4b4bdd96, 0xbdbddc61, 0x8b8b860d, 0x8a8a850f, 0x707090e0, 0x3e3e427c, 0xb5b5c471, 0x6666aacc, 0x4848d890, 0x03030506, 0xf6f601f7, 0x0e0e121c, 0x6161a3c2, 0x35355f6a, 0x5757f9ae, 0xb9b9d069, 0x86869117, 0xc1c15899, 0x1d1d273a, 0x9e9eb927, 0xe1e138d9, 0xf8f813eb, 0x9898b32b, 0x11113322, 0x6969bbd2, 0xd9d970a9, 0x8e8e8907, 0x9494a733, 0x9b9bb62d, 0x1e1e223c, 0x87879215, 0xe9e920c9, 0xcece4987, 0x5555ffaa, 0x28287850, 0xdfdf7aa5, 0x8c8c8f03, 0xa1a1f859, 0x89898009, 0x0d0d171a, 0xbfbfda65, 0xe6e631d7, 0x4242c684, 0x6868b8d0, 0x4141c382, 0x9999b029, 0x2d2d775a, 0x0f0f111e, 0xb0b0cb7b, 0x5454fca8, 0xbbbbd66d, 0x16163a2c];

    // Transformations for decryption
    var T5 = [0x51f4a750, 0x7e416553, 0x1a17a4c3, 0x3a275e96, 0x3bab6bcb, 0x1f9d45f1, 0xacfa58ab, 0x4be30393, 0x2030fa55, 0xad766df6, 0x88cc7691, 0xf5024c25, 0x4fe5d7fc, 0xc52acbd7, 0x26354480, 0xb562a38f, 0xdeb15a49, 0x25ba1b67, 0x45ea0e98, 0x5dfec0e1, 0xc32f7502, 0x814cf012, 0x8d4697a3, 0x6bd3f9c6, 0x038f5fe7, 0x15929c95, 0xbf6d7aeb, 0x955259da, 0xd4be832d, 0x587421d3, 0x49e06929, 0x8ec9c844, 0x75c2896a, 0xf48e7978, 0x99583e6b, 0x27b971dd, 0xbee14fb6, 0xf088ad17, 0xc920ac66, 0x7dce3ab4, 0x63df4a18, 0xe51a3182, 0x97513360, 0x62537f45, 0xb16477e0, 0xbb6bae84, 0xfe81a01c, 0xf9082b94, 0x70486858, 0x8f45fd19, 0x94de6c87, 0x527bf8b7, 0xab73d323, 0x724b02e2, 0xe31f8f57, 0x6655ab2a, 0xb2eb2807, 0x2fb5c203, 0x86c57b9a, 0xd33708a5, 0x302887f2, 0x23bfa5b2, 0x02036aba, 0xed16825c, 0x8acf1c2b, 0xa779b492, 0xf307f2f0, 0x4e69e2a1, 0x65daf4cd, 0x0605bed5, 0xd134621f, 0xc4a6fe8a, 0x342e539d, 0xa2f355a0, 0x058ae132, 0xa4f6eb75, 0x0b83ec39, 0x4060efaa, 0x5e719f06, 0xbd6e1051, 0x3e218af9, 0x96dd063d, 0xdd3e05ae, 0x4de6bd46, 0x91548db5, 0x71c45d05, 0x0406d46f, 0x605015ff, 0x1998fb24, 0xd6bde997, 0x894043cc, 0x67d99e77, 0xb0e842bd, 0x07898b88, 0xe7195b38, 0x79c8eedb, 0xa17c0a47, 0x7c420fe9, 0xf8841ec9, 0x00000000, 0x09808683, 0x322bed48, 0x1e1170ac, 0x6c5a724e, 0xfd0efffb, 0x0f853856, 0x3daed51e, 0x362d3927, 0x0a0fd964, 0x685ca621, 0x9b5b54d1, 0x24362e3a, 0x0c0a67b1, 0x9357e70f, 0xb4ee96d2, 0x1b9b919e, 0x80c0c54f, 0x61dc20a2, 0x5a774b69, 0x1c121a16, 0xe293ba0a, 0xc0a02ae5, 0x3c22e043, 0x121b171d, 0x0e090d0b, 0xf28bc7ad, 0x2db6a8b9, 0x141ea9c8, 0x57f11985, 0xaf75074c, 0xee99ddbb, 0xa37f60fd, 0xf701269f, 0x5c72f5bc, 0x44663bc5, 0x5bfb7e34, 0x8b432976, 0xcb23c6dc, 0xb6edfc68, 0xb8e4f163, 0xd731dcca, 0x42638510, 0x13972240, 0x84c61120, 0x854a247d, 0xd2bb3df8, 0xaef93211, 0xc729a16d, 0x1d9e2f4b, 0xdcb230f3, 0x0d8652ec, 0x77c1e3d0, 0x2bb3166c, 0xa970b999, 0x119448fa, 0x47e96422, 0xa8fc8cc4, 0xa0f03f1a, 0x567d2cd8, 0x223390ef, 0x87494ec7, 0xd938d1c1, 0x8ccaa2fe, 0x98d40b36, 0xa6f581cf, 0xa57ade28, 0xdab78e26, 0x3fadbfa4, 0x2c3a9de4, 0x5078920d, 0x6a5fcc9b, 0x547e4662, 0xf68d13c2, 0x90d8b8e8, 0x2e39f75e, 0x82c3aff5, 0x9f5d80be, 0x69d0937c, 0x6fd52da9, 0xcf2512b3, 0xc8ac993b, 0x10187da7, 0xe89c636e, 0xdb3bbb7b, 0xcd267809, 0x6e5918f4, 0xec9ab701, 0x834f9aa8, 0xe6956e65, 0xaaffe67e, 0x21bccf08, 0xef15e8e6, 0xbae79bd9, 0x4a6f36ce, 0xea9f09d4, 0x29b07cd6, 0x31a4b2af, 0x2a3f2331, 0xc6a59430, 0x35a266c0, 0x744ebc37, 0xfc82caa6, 0xe090d0b0, 0x33a7d815, 0xf104984a, 0x41ecdaf7, 0x7fcd500e, 0x1791f62f, 0x764dd68d, 0x43efb04d, 0xccaa4d54, 0xe49604df, 0x9ed1b5e3, 0x4c6a881b, 0xc12c1fb8, 0x4665517f, 0x9d5eea04, 0x018c355d, 0xfa877473, 0xfb0b412e, 0xb3671d5a, 0x92dbd252, 0xe9105633, 0x6dd64713, 0x9ad7618c, 0x37a10c7a, 0x59f8148e, 0xeb133c89, 0xcea927ee, 0xb761c935, 0xe11ce5ed, 0x7a47b13c, 0x9cd2df59, 0x55f2733f, 0x1814ce79, 0x73c737bf, 0x53f7cdea, 0x5ffdaa5b, 0xdf3d6f14, 0x7844db86, 0xcaaff381, 0xb968c43e, 0x3824342c, 0xc2a3405f, 0x161dc372, 0xbce2250c, 0x283c498b, 0xff0d9541, 0x39a80171, 0x080cb3de, 0xd8b4e49c, 0x6456c190, 0x7bcb8461, 0xd532b670, 0x486c5c74, 0xd0b85742];
    var T6 = [0x5051f4a7, 0x537e4165, 0xc31a17a4, 0x963a275e, 0xcb3bab6b, 0xf11f9d45, 0xabacfa58, 0x934be303, 0x552030fa, 0xf6ad766d, 0x9188cc76, 0x25f5024c, 0xfc4fe5d7, 0xd7c52acb, 0x80263544, 0x8fb562a3, 0x49deb15a, 0x6725ba1b, 0x9845ea0e, 0xe15dfec0, 0x02c32f75, 0x12814cf0, 0xa38d4697, 0xc66bd3f9, 0xe7038f5f, 0x9515929c, 0xebbf6d7a, 0xda955259, 0x2dd4be83, 0xd3587421, 0x2949e069, 0x448ec9c8, 0x6a75c289, 0x78f48e79, 0x6b99583e, 0xdd27b971, 0xb6bee14f, 0x17f088ad, 0x66c920ac, 0xb47dce3a, 0x1863df4a, 0x82e51a31, 0x60975133, 0x4562537f, 0xe0b16477, 0x84bb6bae, 0x1cfe81a0, 0x94f9082b, 0x58704868, 0x198f45fd, 0x8794de6c, 0xb7527bf8, 0x23ab73d3, 0xe2724b02, 0x57e31f8f, 0x2a6655ab, 0x07b2eb28, 0x032fb5c2, 0x9a86c57b, 0xa5d33708, 0xf2302887, 0xb223bfa5, 0xba02036a, 0x5ced1682, 0x2b8acf1c, 0x92a779b4, 0xf0f307f2, 0xa14e69e2, 0xcd65daf4, 0xd50605be, 0x1fd13462, 0x8ac4a6fe, 0x9d342e53, 0xa0a2f355, 0x32058ae1, 0x75a4f6eb, 0x390b83ec, 0xaa4060ef, 0x065e719f, 0x51bd6e10, 0xf93e218a, 0x3d96dd06, 0xaedd3e05, 0x464de6bd, 0xb591548d, 0x0571c45d, 0x6f0406d4, 0xff605015, 0x241998fb, 0x97d6bde9, 0xcc894043, 0x7767d99e, 0xbdb0e842, 0x8807898b, 0x38e7195b, 0xdb79c8ee, 0x47a17c0a, 0xe97c420f, 0xc9f8841e, 0x00000000, 0x83098086, 0x48322bed, 0xac1e1170, 0x4e6c5a72, 0xfbfd0eff, 0x560f8538, 0x1e3daed5, 0x27362d39, 0x640a0fd9, 0x21685ca6, 0xd19b5b54, 0x3a24362e, 0xb10c0a67, 0x0f9357e7, 0xd2b4ee96, 0x9e1b9b91, 0x4f80c0c5, 0xa261dc20, 0x695a774b, 0x161c121a, 0x0ae293ba, 0xe5c0a02a, 0x433c22e0, 0x1d121b17, 0x0b0e090d, 0xadf28bc7, 0xb92db6a8, 0xc8141ea9, 0x8557f119, 0x4caf7507, 0xbbee99dd, 0xfda37f60, 0x9ff70126, 0xbc5c72f5, 0xc544663b, 0x345bfb7e, 0x768b4329, 0xdccb23c6, 0x68b6edfc, 0x63b8e4f1, 0xcad731dc, 0x10426385, 0x40139722, 0x2084c611, 0x7d854a24, 0xf8d2bb3d, 0x11aef932, 0x6dc729a1, 0x4b1d9e2f, 0xf3dcb230, 0xec0d8652, 0xd077c1e3, 0x6c2bb316, 0x99a970b9, 0xfa119448, 0x2247e964, 0xc4a8fc8c, 0x1aa0f03f, 0xd8567d2c, 0xef223390, 0xc787494e, 0xc1d938d1, 0xfe8ccaa2, 0x3698d40b, 0xcfa6f581, 0x28a57ade, 0x26dab78e, 0xa43fadbf, 0xe42c3a9d, 0x0d507892, 0x9b6a5fcc, 0x62547e46, 0xc2f68d13, 0xe890d8b8, 0x5e2e39f7, 0xf582c3af, 0xbe9f5d80, 0x7c69d093, 0xa96fd52d, 0xb3cf2512, 0x3bc8ac99, 0xa710187d, 0x6ee89c63, 0x7bdb3bbb, 0x09cd2678, 0xf46e5918, 0x01ec9ab7, 0xa8834f9a, 0x65e6956e, 0x7eaaffe6, 0x0821bccf, 0xe6ef15e8, 0xd9bae79b, 0xce4a6f36, 0xd4ea9f09, 0xd629b07c, 0xaf31a4b2, 0x312a3f23, 0x30c6a594, 0xc035a266, 0x37744ebc, 0xa6fc82ca, 0xb0e090d0, 0x1533a7d8, 0x4af10498, 0xf741ecda, 0x0e7fcd50, 0x2f1791f6, 0x8d764dd6, 0x4d43efb0, 0x54ccaa4d, 0xdfe49604, 0xe39ed1b5, 0x1b4c6a88, 0xb8c12c1f, 0x7f466551, 0x049d5eea, 0x5d018c35, 0x73fa8774, 0x2efb0b41, 0x5ab3671d, 0x5292dbd2, 0x33e91056, 0x136dd647, 0x8c9ad761, 0x7a37a10c, 0x8e59f814, 0x89eb133c, 0xeecea927, 0x35b761c9, 0xede11ce5, 0x3c7a47b1, 0x599cd2df, 0x3f55f273, 0x791814ce, 0xbf73c737, 0xea53f7cd, 0x5b5ffdaa, 0x14df3d6f, 0x867844db, 0x81caaff3, 0x3eb968c4, 0x2c382434, 0x5fc2a340, 0x72161dc3, 0x0cbce225, 0x8b283c49, 0x41ff0d95, 0x7139a801, 0xde080cb3, 0x9cd8b4e4, 0x906456c1, 0x617bcb84, 0x70d532b6, 0x74486c5c, 0x42d0b857];
    var T7 = [0xa75051f4, 0x65537e41, 0xa4c31a17, 0x5e963a27, 0x6bcb3bab, 0x45f11f9d, 0x58abacfa, 0x03934be3, 0xfa552030, 0x6df6ad76, 0x769188cc, 0x4c25f502, 0xd7fc4fe5, 0xcbd7c52a, 0x44802635, 0xa38fb562, 0x5a49deb1, 0x1b6725ba, 0x0e9845ea, 0xc0e15dfe, 0x7502c32f, 0xf012814c, 0x97a38d46, 0xf9c66bd3, 0x5fe7038f, 0x9c951592, 0x7aebbf6d, 0x59da9552, 0x832dd4be, 0x21d35874, 0x692949e0, 0xc8448ec9, 0x896a75c2, 0x7978f48e, 0x3e6b9958, 0x71dd27b9, 0x4fb6bee1, 0xad17f088, 0xac66c920, 0x3ab47dce, 0x4a1863df, 0x3182e51a, 0x33609751, 0x7f456253, 0x77e0b164, 0xae84bb6b, 0xa01cfe81, 0x2b94f908, 0x68587048, 0xfd198f45, 0x6c8794de, 0xf8b7527b, 0xd323ab73, 0x02e2724b, 0x8f57e31f, 0xab2a6655, 0x2807b2eb, 0xc2032fb5, 0x7b9a86c5, 0x08a5d337, 0x87f23028, 0xa5b223bf, 0x6aba0203, 0x825ced16, 0x1c2b8acf, 0xb492a779, 0xf2f0f307, 0xe2a14e69, 0xf4cd65da, 0xbed50605, 0x621fd134, 0xfe8ac4a6, 0x539d342e, 0x55a0a2f3, 0xe132058a, 0xeb75a4f6, 0xec390b83, 0xefaa4060, 0x9f065e71, 0x1051bd6e, 0x8af93e21, 0x063d96dd, 0x05aedd3e, 0xbd464de6, 0x8db59154, 0x5d0571c4, 0xd46f0406, 0x15ff6050, 0xfb241998, 0xe997d6bd, 0x43cc8940, 0x9e7767d9, 0x42bdb0e8, 0x8b880789, 0x5b38e719, 0xeedb79c8, 0x0a47a17c, 0x0fe97c42, 0x1ec9f884, 0x00000000, 0x86830980, 0xed48322b, 0x70ac1e11, 0x724e6c5a, 0xfffbfd0e, 0x38560f85, 0xd51e3dae, 0x3927362d, 0xd9640a0f, 0xa621685c, 0x54d19b5b, 0x2e3a2436, 0x67b10c0a, 0xe70f9357, 0x96d2b4ee, 0x919e1b9b, 0xc54f80c0, 0x20a261dc, 0x4b695a77, 0x1a161c12, 0xba0ae293, 0x2ae5c0a0, 0xe0433c22, 0x171d121b, 0x0d0b0e09, 0xc7adf28b, 0xa8b92db6, 0xa9c8141e, 0x198557f1, 0x074caf75, 0xddbbee99, 0x60fda37f, 0x269ff701, 0xf5bc5c72, 0x3bc54466, 0x7e345bfb, 0x29768b43, 0xc6dccb23, 0xfc68b6ed, 0xf163b8e4, 0xdccad731, 0x85104263, 0x22401397, 0x112084c6, 0x247d854a, 0x3df8d2bb, 0x3211aef9, 0xa16dc729, 0x2f4b1d9e, 0x30f3dcb2, 0x52ec0d86, 0xe3d077c1, 0x166c2bb3, 0xb999a970, 0x48fa1194, 0x642247e9, 0x8cc4a8fc, 0x3f1aa0f0, 0x2cd8567d, 0x90ef2233, 0x4ec78749, 0xd1c1d938, 0xa2fe8cca, 0x0b3698d4, 0x81cfa6f5, 0xde28a57a, 0x8e26dab7, 0xbfa43fad, 0x9de42c3a, 0x920d5078, 0xcc9b6a5f, 0x4662547e, 0x13c2f68d, 0xb8e890d8, 0xf75e2e39, 0xaff582c3, 0x80be9f5d, 0x937c69d0, 0x2da96fd5, 0x12b3cf25, 0x993bc8ac, 0x7da71018, 0x636ee89c, 0xbb7bdb3b, 0x7809cd26, 0x18f46e59, 0xb701ec9a, 0x9aa8834f, 0x6e65e695, 0xe67eaaff, 0xcf0821bc, 0xe8e6ef15, 0x9bd9bae7, 0x36ce4a6f, 0x09d4ea9f, 0x7cd629b0, 0xb2af31a4, 0x23312a3f, 0x9430c6a5, 0x66c035a2, 0xbc37744e, 0xcaa6fc82, 0xd0b0e090, 0xd81533a7, 0x984af104, 0xdaf741ec, 0x500e7fcd, 0xf62f1791, 0xd68d764d, 0xb04d43ef, 0x4d54ccaa, 0x04dfe496, 0xb5e39ed1, 0x881b4c6a, 0x1fb8c12c, 0x517f4665, 0xea049d5e, 0x355d018c, 0x7473fa87, 0x412efb0b, 0x1d5ab367, 0xd25292db, 0x5633e910, 0x47136dd6, 0x618c9ad7, 0x0c7a37a1, 0x148e59f8, 0x3c89eb13, 0x27eecea9, 0xc935b761, 0xe5ede11c, 0xb13c7a47, 0xdf599cd2, 0x733f55f2, 0xce791814, 0x37bf73c7, 0xcdea53f7, 0xaa5b5ffd, 0x6f14df3d, 0xdb867844, 0xf381caaf, 0xc43eb968, 0x342c3824, 0x405fc2a3, 0xc372161d, 0x250cbce2, 0x498b283c, 0x9541ff0d, 0x017139a8, 0xb3de080c, 0xe49cd8b4, 0xc1906456, 0x84617bcb, 0xb670d532, 0x5c74486c, 0x5742d0b8];
    var T8 = [0xf4a75051, 0x4165537e, 0x17a4c31a, 0x275e963a, 0xab6bcb3b, 0x9d45f11f, 0xfa58abac, 0xe303934b, 0x30fa5520, 0x766df6ad, 0xcc769188, 0x024c25f5, 0xe5d7fc4f, 0x2acbd7c5, 0x35448026, 0x62a38fb5, 0xb15a49de, 0xba1b6725, 0xea0e9845, 0xfec0e15d, 0x2f7502c3, 0x4cf01281, 0x4697a38d, 0xd3f9c66b, 0x8f5fe703, 0x929c9515, 0x6d7aebbf, 0x5259da95, 0xbe832dd4, 0x7421d358, 0xe0692949, 0xc9c8448e, 0xc2896a75, 0x8e7978f4, 0x583e6b99, 0xb971dd27, 0xe14fb6be, 0x88ad17f0, 0x20ac66c9, 0xce3ab47d, 0xdf4a1863, 0x1a3182e5, 0x51336097, 0x537f4562, 0x6477e0b1, 0x6bae84bb, 0x81a01cfe, 0x082b94f9, 0x48685870, 0x45fd198f, 0xde6c8794, 0x7bf8b752, 0x73d323ab, 0x4b02e272, 0x1f8f57e3, 0x55ab2a66, 0xeb2807b2, 0xb5c2032f, 0xc57b9a86, 0x3708a5d3, 0x2887f230, 0xbfa5b223, 0x036aba02, 0x16825ced, 0xcf1c2b8a, 0x79b492a7, 0x07f2f0f3, 0x69e2a14e, 0xdaf4cd65, 0x05bed506, 0x34621fd1, 0xa6fe8ac4, 0x2e539d34, 0xf355a0a2, 0x8ae13205, 0xf6eb75a4, 0x83ec390b, 0x60efaa40, 0x719f065e, 0x6e1051bd, 0x218af93e, 0xdd063d96, 0x3e05aedd, 0xe6bd464d, 0x548db591, 0xc45d0571, 0x06d46f04, 0x5015ff60, 0x98fb2419, 0xbde997d6, 0x4043cc89, 0xd99e7767, 0xe842bdb0, 0x898b8807, 0x195b38e7, 0xc8eedb79, 0x7c0a47a1, 0x420fe97c, 0x841ec9f8, 0x00000000, 0x80868309, 0x2bed4832, 0x1170ac1e, 0x5a724e6c, 0x0efffbfd, 0x8538560f, 0xaed51e3d, 0x2d392736, 0x0fd9640a, 0x5ca62168, 0x5b54d19b, 0x362e3a24, 0x0a67b10c, 0x57e70f93, 0xee96d2b4, 0x9b919e1b, 0xc0c54f80, 0xdc20a261, 0x774b695a, 0x121a161c, 0x93ba0ae2, 0xa02ae5c0, 0x22e0433c, 0x1b171d12, 0x090d0b0e, 0x8bc7adf2, 0xb6a8b92d, 0x1ea9c814, 0xf1198557, 0x75074caf, 0x99ddbbee, 0x7f60fda3, 0x01269ff7, 0x72f5bc5c, 0x663bc544, 0xfb7e345b, 0x4329768b, 0x23c6dccb, 0xedfc68b6, 0xe4f163b8, 0x31dccad7, 0x63851042, 0x97224013, 0xc6112084, 0x4a247d85, 0xbb3df8d2, 0xf93211ae, 0x29a16dc7, 0x9e2f4b1d, 0xb230f3dc, 0x8652ec0d, 0xc1e3d077, 0xb3166c2b, 0x70b999a9, 0x9448fa11, 0xe9642247, 0xfc8cc4a8, 0xf03f1aa0, 0x7d2cd856, 0x3390ef22, 0x494ec787, 0x38d1c1d9, 0xcaa2fe8c, 0xd40b3698, 0xf581cfa6, 0x7ade28a5, 0xb78e26da, 0xadbfa43f, 0x3a9de42c, 0x78920d50, 0x5fcc9b6a, 0x7e466254, 0x8d13c2f6, 0xd8b8e890, 0x39f75e2e, 0xc3aff582, 0x5d80be9f, 0xd0937c69, 0xd52da96f, 0x2512b3cf, 0xac993bc8, 0x187da710, 0x9c636ee8, 0x3bbb7bdb, 0x267809cd, 0x5918f46e, 0x9ab701ec, 0x4f9aa883, 0x956e65e6, 0xffe67eaa, 0xbccf0821, 0x15e8e6ef, 0xe79bd9ba, 0x6f36ce4a, 0x9f09d4ea, 0xb07cd629, 0xa4b2af31, 0x3f23312a, 0xa59430c6, 0xa266c035, 0x4ebc3774, 0x82caa6fc, 0x90d0b0e0, 0xa7d81533, 0x04984af1, 0xecdaf741, 0xcd500e7f, 0x91f62f17, 0x4dd68d76, 0xefb04d43, 0xaa4d54cc, 0x9604dfe4, 0xd1b5e39e, 0x6a881b4c, 0x2c1fb8c1, 0x65517f46, 0x5eea049d, 0x8c355d01, 0x877473fa, 0x0b412efb, 0x671d5ab3, 0xdbd25292, 0x105633e9, 0xd647136d, 0xd7618c9a, 0xa10c7a37, 0xf8148e59, 0x133c89eb, 0xa927eece, 0x61c935b7, 0x1ce5ede1, 0x47b13c7a, 0xd2df599c, 0xf2733f55, 0x14ce7918, 0xc737bf73, 0xf7cdea53, 0xfdaa5b5f, 0x3d6f14df, 0x44db8678, 0xaff381ca, 0x68c43eb9, 0x24342c38, 0xa3405fc2, 0x1dc37216, 0xe2250cbc, 0x3c498b28, 0x0d9541ff, 0xa8017139, 0x0cb3de08, 0xb4e49cd8, 0x56c19064, 0xcb84617b, 0x32b670d5, 0x6c5c7448, 0xb85742d0];

    // Transformations for decryption key expansion
    var U1 = [0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28, 0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b, 0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742, 0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd, 0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba, 0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f, 0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3];
    var U2 = [0x00000000, 0x0b0e090d, 0x161c121a, 0x1d121b17, 0x2c382434, 0x27362d39, 0x3a24362e, 0x312a3f23, 0x58704868, 0x537e4165, 0x4e6c5a72, 0x4562537f, 0x74486c5c, 0x7f466551, 0x62547e46, 0x695a774b, 0xb0e090d0, 0xbbee99dd, 0xa6fc82ca, 0xadf28bc7, 0x9cd8b4e4, 0x97d6bde9, 0x8ac4a6fe, 0x81caaff3, 0xe890d8b8, 0xe39ed1b5, 0xfe8ccaa2, 0xf582c3af, 0xc4a8fc8c, 0xcfa6f581, 0xd2b4ee96, 0xd9bae79b, 0x7bdb3bbb, 0x70d532b6, 0x6dc729a1, 0x66c920ac, 0x57e31f8f, 0x5ced1682, 0x41ff0d95, 0x4af10498, 0x23ab73d3, 0x28a57ade, 0x35b761c9, 0x3eb968c4, 0x0f9357e7, 0x049d5eea, 0x198f45fd, 0x12814cf0, 0xcb3bab6b, 0xc035a266, 0xdd27b971, 0xd629b07c, 0xe7038f5f, 0xec0d8652, 0xf11f9d45, 0xfa119448, 0x934be303, 0x9845ea0e, 0x8557f119, 0x8e59f814, 0xbf73c737, 0xb47dce3a, 0xa96fd52d, 0xa261dc20, 0xf6ad766d, 0xfda37f60, 0xe0b16477, 0xebbf6d7a, 0xda955259, 0xd19b5b54, 0xcc894043, 0xc787494e, 0xaedd3e05, 0xa5d33708, 0xb8c12c1f, 0xb3cf2512, 0x82e51a31, 0x89eb133c, 0x94f9082b, 0x9ff70126, 0x464de6bd, 0x4d43efb0, 0x5051f4a7, 0x5b5ffdaa, 0x6a75c289, 0x617bcb84, 0x7c69d093, 0x7767d99e, 0x1e3daed5, 0x1533a7d8, 0x0821bccf, 0x032fb5c2, 0x32058ae1, 0x390b83ec, 0x241998fb, 0x2f1791f6, 0x8d764dd6, 0x867844db, 0x9b6a5fcc, 0x906456c1, 0xa14e69e2, 0xaa4060ef, 0xb7527bf8, 0xbc5c72f5, 0xd50605be, 0xde080cb3, 0xc31a17a4, 0xc8141ea9, 0xf93e218a, 0xf2302887, 0xef223390, 0xe42c3a9d, 0x3d96dd06, 0x3698d40b, 0x2b8acf1c, 0x2084c611, 0x11aef932, 0x1aa0f03f, 0x07b2eb28, 0x0cbce225, 0x65e6956e, 0x6ee89c63, 0x73fa8774, 0x78f48e79, 0x49deb15a, 0x42d0b857, 0x5fc2a340, 0x54ccaa4d, 0xf741ecda, 0xfc4fe5d7, 0xe15dfec0, 0xea53f7cd, 0xdb79c8ee, 0xd077c1e3, 0xcd65daf4, 0xc66bd3f9, 0xaf31a4b2, 0xa43fadbf, 0xb92db6a8, 0xb223bfa5, 0x83098086, 0x8807898b, 0x9515929c, 0x9e1b9b91, 0x47a17c0a, 0x4caf7507, 0x51bd6e10, 0x5ab3671d, 0x6b99583e, 0x60975133, 0x7d854a24, 0x768b4329, 0x1fd13462, 0x14df3d6f, 0x09cd2678, 0x02c32f75, 0x33e91056, 0x38e7195b, 0x25f5024c, 0x2efb0b41, 0x8c9ad761, 0x8794de6c, 0x9a86c57b, 0x9188cc76, 0xa0a2f355, 0xabacfa58, 0xb6bee14f, 0xbdb0e842, 0xd4ea9f09, 0xdfe49604, 0xc2f68d13, 0xc9f8841e, 0xf8d2bb3d, 0xf3dcb230, 0xeecea927, 0xe5c0a02a, 0x3c7a47b1, 0x37744ebc, 0x2a6655ab, 0x21685ca6, 0x10426385, 0x1b4c6a88, 0x065e719f, 0x0d507892, 0x640a0fd9, 0x6f0406d4, 0x72161dc3, 0x791814ce, 0x48322bed, 0x433c22e0, 0x5e2e39f7, 0x552030fa, 0x01ec9ab7, 0x0ae293ba, 0x17f088ad, 0x1cfe81a0, 0x2dd4be83, 0x26dab78e, 0x3bc8ac99, 0x30c6a594, 0x599cd2df, 0x5292dbd2, 0x4f80c0c5, 0x448ec9c8, 0x75a4f6eb, 0x7eaaffe6, 0x63b8e4f1, 0x68b6edfc, 0xb10c0a67, 0xba02036a, 0xa710187d, 0xac1e1170, 0x9d342e53, 0x963a275e, 0x8b283c49, 0x80263544, 0xe97c420f, 0xe2724b02, 0xff605015, 0xf46e5918, 0xc544663b, 0xce4a6f36, 0xd3587421, 0xd8567d2c, 0x7a37a10c, 0x7139a801, 0x6c2bb316, 0x6725ba1b, 0x560f8538, 0x5d018c35, 0x40139722, 0x4b1d9e2f, 0x2247e964, 0x2949e069, 0x345bfb7e, 0x3f55f273, 0x0e7fcd50, 0x0571c45d, 0x1863df4a, 0x136dd647, 0xcad731dc, 0xc1d938d1, 0xdccb23c6, 0xd7c52acb, 0xe6ef15e8, 0xede11ce5, 0xf0f307f2, 0xfbfd0eff, 0x92a779b4, 0x99a970b9, 0x84bb6bae, 0x8fb562a3, 0xbe9f5d80, 0xb591548d, 0xa8834f9a, 0xa38d4697];
    var U3 = [0x00000000, 0x0d0b0e09, 0x1a161c12, 0x171d121b, 0x342c3824, 0x3927362d, 0x2e3a2436, 0x23312a3f, 0x68587048, 0x65537e41, 0x724e6c5a, 0x7f456253, 0x5c74486c, 0x517f4665, 0x4662547e, 0x4b695a77, 0xd0b0e090, 0xddbbee99, 0xcaa6fc82, 0xc7adf28b, 0xe49cd8b4, 0xe997d6bd, 0xfe8ac4a6, 0xf381caaf, 0xb8e890d8, 0xb5e39ed1, 0xa2fe8cca, 0xaff582c3, 0x8cc4a8fc, 0x81cfa6f5, 0x96d2b4ee, 0x9bd9bae7, 0xbb7bdb3b, 0xb670d532, 0xa16dc729, 0xac66c920, 0x8f57e31f, 0x825ced16, 0x9541ff0d, 0x984af104, 0xd323ab73, 0xde28a57a, 0xc935b761, 0xc43eb968, 0xe70f9357, 0xea049d5e, 0xfd198f45, 0xf012814c, 0x6bcb3bab, 0x66c035a2, 0x71dd27b9, 0x7cd629b0, 0x5fe7038f, 0x52ec0d86, 0x45f11f9d, 0x48fa1194, 0x03934be3, 0x0e9845ea, 0x198557f1, 0x148e59f8, 0x37bf73c7, 0x3ab47dce, 0x2da96fd5, 0x20a261dc, 0x6df6ad76, 0x60fda37f, 0x77e0b164, 0x7aebbf6d, 0x59da9552, 0x54d19b5b, 0x43cc8940, 0x4ec78749, 0x05aedd3e, 0x08a5d337, 0x1fb8c12c, 0x12b3cf25, 0x3182e51a, 0x3c89eb13, 0x2b94f908, 0x269ff701, 0xbd464de6, 0xb04d43ef, 0xa75051f4, 0xaa5b5ffd, 0x896a75c2, 0x84617bcb, 0x937c69d0, 0x9e7767d9, 0xd51e3dae, 0xd81533a7, 0xcf0821bc, 0xc2032fb5, 0xe132058a, 0xec390b83, 0xfb241998, 0xf62f1791, 0xd68d764d, 0xdb867844, 0xcc9b6a5f, 0xc1906456, 0xe2a14e69, 0xefaa4060, 0xf8b7527b, 0xf5bc5c72, 0xbed50605, 0xb3de080c, 0xa4c31a17, 0xa9c8141e, 0x8af93e21, 0x87f23028, 0x90ef2233, 0x9de42c3a, 0x063d96dd, 0x0b3698d4, 0x1c2b8acf, 0x112084c6, 0x3211aef9, 0x3f1aa0f0, 0x2807b2eb, 0x250cbce2, 0x6e65e695, 0x636ee89c, 0x7473fa87, 0x7978f48e, 0x5a49deb1, 0x5742d0b8, 0x405fc2a3, 0x4d54ccaa, 0xdaf741ec, 0xd7fc4fe5, 0xc0e15dfe, 0xcdea53f7, 0xeedb79c8, 0xe3d077c1, 0xf4cd65da, 0xf9c66bd3, 0xb2af31a4, 0xbfa43fad, 0xa8b92db6, 0xa5b223bf, 0x86830980, 0x8b880789, 0x9c951592, 0x919e1b9b, 0x0a47a17c, 0x074caf75, 0x1051bd6e, 0x1d5ab367, 0x3e6b9958, 0x33609751, 0x247d854a, 0x29768b43, 0x621fd134, 0x6f14df3d, 0x7809cd26, 0x7502c32f, 0x5633e910, 0x5b38e719, 0x4c25f502, 0x412efb0b, 0x618c9ad7, 0x6c8794de, 0x7b9a86c5, 0x769188cc, 0x55a0a2f3, 0x58abacfa, 0x4fb6bee1, 0x42bdb0e8, 0x09d4ea9f, 0x04dfe496, 0x13c2f68d, 0x1ec9f884, 0x3df8d2bb, 0x30f3dcb2, 0x27eecea9, 0x2ae5c0a0, 0xb13c7a47, 0xbc37744e, 0xab2a6655, 0xa621685c, 0x85104263, 0x881b4c6a, 0x9f065e71, 0x920d5078, 0xd9640a0f, 0xd46f0406, 0xc372161d, 0xce791814, 0xed48322b, 0xe0433c22, 0xf75e2e39, 0xfa552030, 0xb701ec9a, 0xba0ae293, 0xad17f088, 0xa01cfe81, 0x832dd4be, 0x8e26dab7, 0x993bc8ac, 0x9430c6a5, 0xdf599cd2, 0xd25292db, 0xc54f80c0, 0xc8448ec9, 0xeb75a4f6, 0xe67eaaff, 0xf163b8e4, 0xfc68b6ed, 0x67b10c0a, 0x6aba0203, 0x7da71018, 0x70ac1e11, 0x539d342e, 0x5e963a27, 0x498b283c, 0x44802635, 0x0fe97c42, 0x02e2724b, 0x15ff6050, 0x18f46e59, 0x3bc54466, 0x36ce4a6f, 0x21d35874, 0x2cd8567d, 0x0c7a37a1, 0x017139a8, 0x166c2bb3, 0x1b6725ba, 0x38560f85, 0x355d018c, 0x22401397, 0x2f4b1d9e, 0x642247e9, 0x692949e0, 0x7e345bfb, 0x733f55f2, 0x500e7fcd, 0x5d0571c4, 0x4a1863df, 0x47136dd6, 0xdccad731, 0xd1c1d938, 0xc6dccb23, 0xcbd7c52a, 0xe8e6ef15, 0xe5ede11c, 0xf2f0f307, 0xfffbfd0e, 0xb492a779, 0xb999a970, 0xae84bb6b, 0xa38fb562, 0x80be9f5d, 0x8db59154, 0x9aa8834f, 0x97a38d46];
    var U4 = [0x00000000, 0x090d0b0e, 0x121a161c, 0x1b171d12, 0x24342c38, 0x2d392736, 0x362e3a24, 0x3f23312a, 0x48685870, 0x4165537e, 0x5a724e6c, 0x537f4562, 0x6c5c7448, 0x65517f46, 0x7e466254, 0x774b695a, 0x90d0b0e0, 0x99ddbbee, 0x82caa6fc, 0x8bc7adf2, 0xb4e49cd8, 0xbde997d6, 0xa6fe8ac4, 0xaff381ca, 0xd8b8e890, 0xd1b5e39e, 0xcaa2fe8c, 0xc3aff582, 0xfc8cc4a8, 0xf581cfa6, 0xee96d2b4, 0xe79bd9ba, 0x3bbb7bdb, 0x32b670d5, 0x29a16dc7, 0x20ac66c9, 0x1f8f57e3, 0x16825ced, 0x0d9541ff, 0x04984af1, 0x73d323ab, 0x7ade28a5, 0x61c935b7, 0x68c43eb9, 0x57e70f93, 0x5eea049d, 0x45fd198f, 0x4cf01281, 0xab6bcb3b, 0xa266c035, 0xb971dd27, 0xb07cd629, 0x8f5fe703, 0x8652ec0d, 0x9d45f11f, 0x9448fa11, 0xe303934b, 0xea0e9845, 0xf1198557, 0xf8148e59, 0xc737bf73, 0xce3ab47d, 0xd52da96f, 0xdc20a261, 0x766df6ad, 0x7f60fda3, 0x6477e0b1, 0x6d7aebbf, 0x5259da95, 0x5b54d19b, 0x4043cc89, 0x494ec787, 0x3e05aedd, 0x3708a5d3, 0x2c1fb8c1, 0x2512b3cf, 0x1a3182e5, 0x133c89eb, 0x082b94f9, 0x01269ff7, 0xe6bd464d, 0xefb04d43, 0xf4a75051, 0xfdaa5b5f, 0xc2896a75, 0xcb84617b, 0xd0937c69, 0xd99e7767, 0xaed51e3d, 0xa7d81533, 0xbccf0821, 0xb5c2032f, 0x8ae13205, 0x83ec390b, 0x98fb2419, 0x91f62f17, 0x4dd68d76, 0x44db8678, 0x5fcc9b6a, 0x56c19064, 0x69e2a14e, 0x60efaa40, 0x7bf8b752, 0x72f5bc5c, 0x05bed506, 0x0cb3de08, 0x17a4c31a, 0x1ea9c814, 0x218af93e, 0x2887f230, 0x3390ef22, 0x3a9de42c, 0xdd063d96, 0xd40b3698, 0xcf1c2b8a, 0xc6112084, 0xf93211ae, 0xf03f1aa0, 0xeb2807b2, 0xe2250cbc, 0x956e65e6, 0x9c636ee8, 0x877473fa, 0x8e7978f4, 0xb15a49de, 0xb85742d0, 0xa3405fc2, 0xaa4d54cc, 0xecdaf741, 0xe5d7fc4f, 0xfec0e15d, 0xf7cdea53, 0xc8eedb79, 0xc1e3d077, 0xdaf4cd65, 0xd3f9c66b, 0xa4b2af31, 0xadbfa43f, 0xb6a8b92d, 0xbfa5b223, 0x80868309, 0x898b8807, 0x929c9515, 0x9b919e1b, 0x7c0a47a1, 0x75074caf, 0x6e1051bd, 0x671d5ab3, 0x583e6b99, 0x51336097, 0x4a247d85, 0x4329768b, 0x34621fd1, 0x3d6f14df, 0x267809cd, 0x2f7502c3, 0x105633e9, 0x195b38e7, 0x024c25f5, 0x0b412efb, 0xd7618c9a, 0xde6c8794, 0xc57b9a86, 0xcc769188, 0xf355a0a2, 0xfa58abac, 0xe14fb6be, 0xe842bdb0, 0x9f09d4ea, 0x9604dfe4, 0x8d13c2f6, 0x841ec9f8, 0xbb3df8d2, 0xb230f3dc, 0xa927eece, 0xa02ae5c0, 0x47b13c7a, 0x4ebc3774, 0x55ab2a66, 0x5ca62168, 0x63851042, 0x6a881b4c, 0x719f065e, 0x78920d50, 0x0fd9640a, 0x06d46f04, 0x1dc37216, 0x14ce7918, 0x2bed4832, 0x22e0433c, 0x39f75e2e, 0x30fa5520, 0x9ab701ec, 0x93ba0ae2, 0x88ad17f0, 0x81a01cfe, 0xbe832dd4, 0xb78e26da, 0xac993bc8, 0xa59430c6, 0xd2df599c, 0xdbd25292, 0xc0c54f80, 0xc9c8448e, 0xf6eb75a4, 0xffe67eaa, 0xe4f163b8, 0xedfc68b6, 0x0a67b10c, 0x036aba02, 0x187da710, 0x1170ac1e, 0x2e539d34, 0x275e963a, 0x3c498b28, 0x35448026, 0x420fe97c, 0x4b02e272, 0x5015ff60, 0x5918f46e, 0x663bc544, 0x6f36ce4a, 0x7421d358, 0x7d2cd856, 0xa10c7a37, 0xa8017139, 0xb3166c2b, 0xba1b6725, 0x8538560f, 0x8c355d01, 0x97224013, 0x9e2f4b1d, 0xe9642247, 0xe0692949, 0xfb7e345b, 0xf2733f55, 0xcd500e7f, 0xc45d0571, 0xdf4a1863, 0xd647136d, 0x31dccad7, 0x38d1c1d9, 0x23c6dccb, 0x2acbd7c5, 0x15e8e6ef, 0x1ce5ede1, 0x07f2f0f3, 0x0efffbfd, 0x79b492a7, 0x70b999a9, 0x6bae84bb, 0x62a38fb5, 0x5d80be9f, 0x548db591, 0x4f9aa883, 0x4697a38d];

    function convertToInt32(bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i += 4) {
            result.push(
                (bytes[i    ] << 24) |
                (bytes[i + 1] << 16) |
                (bytes[i + 2] <<  8) |
                 bytes[i + 3]
            );
        }
        return result;
    }

    var AES = function(key) {
        if (!(this instanceof AES)) {
            throw Error('AES must be instanitated with `new`');
        }

        Object.defineProperty(this, 'key', {
            value: coerceArray(key, true)
        });

        this._prepare();
    }


    AES.prototype._prepare = function() {

        var rounds = numberOfRounds[this.key.length];
        if (rounds == null) {
            throw new Error('invalid key size (must be 16, 24 or 32 bytes)');
        }

        // encryption round keys
        this._Ke = [];

        // decryption round keys
        this._Kd = [];

        for (var i = 0; i <= rounds; i++) {
            this._Ke.push([0, 0, 0, 0]);
            this._Kd.push([0, 0, 0, 0]);
        }

        var roundKeyCount = (rounds + 1) * 4;
        var KC = this.key.length / 4;

        // convert the key into ints
        var tk = convertToInt32(this.key);

        // copy values into round key arrays
        var index;
        for (var i = 0; i < KC; i++) {
            index = i >> 2;
            this._Ke[index][i % 4] = tk[i];
            this._Kd[rounds - index][i % 4] = tk[i];
        }

        // key expansion (fips-197 section 5.2)
        var rconpointer = 0;
        var t = KC, tt;
        while (t < roundKeyCount) {
            tt = tk[KC - 1];
            tk[0] ^= ((S[(tt >> 16) & 0xFF] << 24) ^
                      (S[(tt >>  8) & 0xFF] << 16) ^
                      (S[ tt        & 0xFF] <<  8) ^
                       S[(tt >> 24) & 0xFF]        ^
                      (rcon[rconpointer] << 24));
            rconpointer += 1;

            // key expansion (for non-256 bit)
            if (KC != 8) {
                for (var i = 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }

            // key expansion for 256-bit keys is "slightly different" (fips-197)
            } else {
                for (var i = 1; i < (KC / 2); i++) {
                    tk[i] ^= tk[i - 1];
                }
                tt = tk[(KC / 2) - 1];

                tk[KC / 2] ^= (S[ tt        & 0xFF]        ^
                              (S[(tt >>  8) & 0xFF] <<  8) ^
                              (S[(tt >> 16) & 0xFF] << 16) ^
                              (S[(tt >> 24) & 0xFF] << 24));

                for (var i = (KC / 2) + 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }
            }

            // copy values into round key arrays
            var i = 0, r, c;
            while (i < KC && t < roundKeyCount) {
                r = t >> 2;
                c = t % 4;
                this._Ke[r][c] = tk[i];
                this._Kd[rounds - r][c] = tk[i++];
                t++;
            }
        }

        // inverse-cipher-ify the decryption round key (fips-197 section 5.3)
        for (var r = 1; r < rounds; r++) {
            for (var c = 0; c < 4; c++) {
                tt = this._Kd[r][c];
                this._Kd[r][c] = (U1[(tt >> 24) & 0xFF] ^
                                  U2[(tt >> 16) & 0xFF] ^
                                  U3[(tt >>  8) & 0xFF] ^
                                  U4[ tt        & 0xFF]);
            }
        }
    }

    AES.prototype.encrypt = function(plaintext) {
        if (plaintext.length != 16) {
            throw new Error('invalid plaintext size (must be 16 bytes)');
        }

        var rounds = this._Ke.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(plaintext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Ke[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T1[(t[ i         ] >> 24) & 0xff] ^
                        T2[(t[(i + 1) % 4] >> 16) & 0xff] ^
                        T3[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T4[ t[(i + 3) % 4]        & 0xff] ^
                        this._Ke[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Ke[rounds][i];
            result[4 * i    ] = (S[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (S[(t[(i + 1) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (S[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (S[ t[(i + 3) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    }

    AES.prototype.decrypt = function(ciphertext) {
        if (ciphertext.length != 16) {
            throw new Error('invalid ciphertext size (must be 16 bytes)');
        }

        var rounds = this._Kd.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(ciphertext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Kd[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T5[(t[ i          ] >> 24) & 0xff] ^
                        T6[(t[(i + 3) % 4] >> 16) & 0xff] ^
                        T7[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T8[ t[(i + 1) % 4]        & 0xff] ^
                        this._Kd[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Kd[rounds][i];
            result[4 * i    ] = (Si[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (Si[(t[(i + 3) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (Si[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (Si[ t[(i + 1) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    }


    /**
     *  Mode Of Operation - Electonic Codebook (ECB)
     */
    var ModeOfOperationECB = function(key) {
        if (!(this instanceof ModeOfOperationECB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Electronic Code Block";
        this.name = "ecb";

        this._aes = new AES(key);
    }

    ModeOfOperationECB.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);
            block = this._aes.encrypt(block);
            copyArray(block, ciphertext, i);
        }

        return ciphertext;
    }

    ModeOfOperationECB.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);
            copyArray(block, plaintext, i);
        }

        return plaintext;
    }


    /**
     *  Mode Of Operation - Cipher Block Chaining (CBC)
     */
    var ModeOfOperationCBC = function(key, iv) {
        if (!(this instanceof ModeOfOperationCBC)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Block Chaining";
        this.name = "cbc";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastCipherblock = coerceArray(iv, true);

        this._aes = new AES(key);
    }

    ModeOfOperationCBC.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);

            for (var j = 0; j < 16; j++) {
                block[j] ^= this._lastCipherblock[j];
            }

            this._lastCipherblock = this._aes.encrypt(block);
            copyArray(this._lastCipherblock, ciphertext, i);
        }

        return ciphertext;
    }

    ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);

            for (var j = 0; j < 16; j++) {
                plaintext[i + j] = block[j] ^ this._lastCipherblock[j];
            }

            copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16);
        }

        return plaintext;
    }


    /**
     *  Mode Of Operation - Cipher Feedback (CFB)
     */
    var ModeOfOperationCFB = function(key, iv, segmentSize) {
        if (!(this instanceof ModeOfOperationCFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Feedback";
        this.name = "cfb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 size)');
        }

        if (!segmentSize) { segmentSize = 1; }

        this.segmentSize = segmentSize;

        this._shiftRegister = coerceArray(iv, true);

        this._aes = new AES(key);
    }

    ModeOfOperationCFB.prototype.encrypt = function(plaintext) {
        if ((plaintext.length % this.segmentSize) != 0) {
            throw new Error('invalid plaintext size (must be segmentSize bytes)');
        }

        var encrypted = coerceArray(plaintext, true);

        var xorSegment;
        for (var i = 0; i < encrypted.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);
            for (var j = 0; j < this.segmentSize; j++) {
                encrypted[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(encrypted, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return encrypted;
    }

    ModeOfOperationCFB.prototype.decrypt = function(ciphertext) {
        if ((ciphertext.length % this.segmentSize) != 0) {
            throw new Error('invalid ciphertext size (must be segmentSize bytes)');
        }

        var plaintext = coerceArray(ciphertext, true);

        var xorSegment;
        for (var i = 0; i < plaintext.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);

            for (var j = 0; j < this.segmentSize; j++) {
                plaintext[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(ciphertext, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return plaintext;
    }

    /**
     *  Mode Of Operation - Output Feedback (OFB)
     */
    var ModeOfOperationOFB = function(key, iv) {
        if (!(this instanceof ModeOfOperationOFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Output Feedback";
        this.name = "ofb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastPrecipher = coerceArray(iv, true);
        this._lastPrecipherIndex = 16;

        this._aes = new AES(key);
    }

    ModeOfOperationOFB.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._lastPrecipherIndex === 16) {
                this._lastPrecipher = this._aes.encrypt(this._lastPrecipher);
                this._lastPrecipherIndex = 0;
            }
            encrypted[i] ^= this._lastPrecipher[this._lastPrecipherIndex++];
        }

        return encrypted;
    }

    // Decryption is symetric
    ModeOfOperationOFB.prototype.decrypt = ModeOfOperationOFB.prototype.encrypt;


    /**
     *  Counter object for CTR common mode of operation
     */
    var Counter = function(initialValue) {
        if (!(this instanceof Counter)) {
            throw Error('Counter must be instanitated with `new`');
        }

        // We allow 0, but anything false-ish uses the default 1
        if (initialValue !== 0 && !initialValue) { initialValue = 1; }

        if (typeof(initialValue) === 'number') {
            this._counter = createArray(16);
            this.setValue(initialValue);

        } else {
            this.setBytes(initialValue);
        }
    }

    Counter.prototype.setValue = function(value) {
        if (typeof(value) !== 'number' || parseInt(value) != value) {
            throw new Error('invalid counter value (must be an integer)');
        }

        // We cannot safely handle numbers beyond the safe range for integers
        if (value > Number.MAX_SAFE_INTEGER) {
            throw new Error('integer value out of safe range');
        }

        for (var index = 15; index >= 0; --index) {
            this._counter[index] = value % 256;
            value = parseInt(value / 256);
        }
    }

    Counter.prototype.setBytes = function(bytes) {
        bytes = coerceArray(bytes, true);

        if (bytes.length != 16) {
            throw new Error('invalid counter bytes size (must be 16 bytes)');
        }

        this._counter = bytes;
    };

    Counter.prototype.increment = function() {
        for (var i = 15; i >= 0; i--) {
            if (this._counter[i] === 255) {
                this._counter[i] = 0;
            } else {
                this._counter[i]++;
                break;
            }
        }
    }


    /**
     *  Mode Of Operation - Counter (CTR)
     */
    var ModeOfOperationCTR = function(key, counter) {
        if (!(this instanceof ModeOfOperationCTR)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Counter";
        this.name = "ctr";

        if (!(counter instanceof Counter)) {
            counter = new Counter(counter)
        }

        this._counter = counter;

        this._remainingCounter = null;
        this._remainingCounterIndex = 16;

        this._aes = new AES(key);
    }

    ModeOfOperationCTR.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._remainingCounterIndex === 16) {
                this._remainingCounter = this._aes.encrypt(this._counter._counter);
                this._remainingCounterIndex = 0;
                this._counter.increment();
            }
            encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++];
        }

        return encrypted;
    }

    // Decryption is symetric
    ModeOfOperationCTR.prototype.decrypt = ModeOfOperationCTR.prototype.encrypt;


    ///////////////////////
    // Padding

    // See:https://tools.ietf.org/html/rfc2315
    function pkcs7pad(data) {
        data = coerceArray(data, true);
        var padder = 16 - (data.length % 16);
        var result = createArray(data.length + padder);
        copyArray(data, result);
        for (var i = data.length; i < result.length; i++) {
            result[i] = padder;
        }
        return result;
    }

    function pkcs7strip(data) {
        data = coerceArray(data, true);
        if (data.length < 16) { throw new Error('PKCS#7 invalid length'); }

        var padder = data[data.length - 1];
        if (padder > 16) { throw new Error('PKCS#7 padding byte out of range'); }

        var length = data.length - padder;
        for (var i = 0; i < padder; i++) {
            if (data[length + i] !== padder) {
                throw new Error('PKCS#7 invalid padding byte');
            }
        }

        var result = createArray(length);
        copyArray(data, result, 0, 0, length);
        return result;
    }

    ///////////////////////
    // Exporting


    // The block cipher
    var aesjs = {
        AES: AES,
        Counter: Counter,

        ModeOfOperation: {
            ecb: ModeOfOperationECB,
            cbc: ModeOfOperationCBC,
            cfb: ModeOfOperationCFB,
            ofb: ModeOfOperationOFB,
            ctr: ModeOfOperationCTR
        },

        utils: {
            hex: convertHex,
            utf8: convertUtf8
        },

        padding: {
            pkcs7: {
                pad: pkcs7pad,
                strip: pkcs7strip
            }
        },

        _arrayTest: {
            coerceArray: coerceArray,
            createArray: createArray,
            copyArray: copyArray,
        }
    };


    // node.js
    if (typeof exports !== 'undefined') {
        module.exports = aesjs

    // RequireJS/AMD
    // http://www.requirejs.org/docs/api.html
    // https://github.com/amdjs/amdjs-api/wiki/AMD
    } else if (typeof(define) === 'function' && define.amd) {
        define([], function() { return aesjs; });

    // Web Browsers
    } else {

        // If there was an existing library at "aesjs" make sure it's still available
        if (root.aesjs) {
            aesjs._aesjs = root.aesjs;
        }

        root.aesjs = aesjs;
    }


})(this);

try{ if (typeof aesjs !== "undefined" && window) window.aesjs = aesjs; }catch(e){}
}).call(window);

// ---- vendor: lz-string ----
;(function(){ var module, exports, angular, define;try{ if (typeof LZString !== "undefined" && window) window.LZString = LZString; }catch(e){}
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.5
var LZString = (function() {

// private property
var f = String.fromCharCode;
var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
var baseReverseDic = {};

function getBaseValue(alphabet, character) {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (var i=0 ; i<alphabet.length ; i++) {
      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
    }
  }
  return baseReverseDic[alphabet][character];
}

var LZString = {
  compressToBase64 : function (input) {
    if (input == null) return "";
    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
    switch (res.length % 4) { // To produce valid Base64
    default: // When could this happen ?
    case 0 : return res;
    case 1 : return res+"===";
    case 2 : return res+"==";
    case 3 : return res+"=";
    }
  },

  decompressFromBase64 : function (input) {
    if (input == null) return "";
    if (input == "") return null;
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
  },

  compressToUTF16 : function (input) {
    if (input == null) return "";
    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
  },

  decompressFromUTF16: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
  },

  //compress into uint8array (UCS-2 big endian format)
  compressToUint8Array: function (uncompressed) {
    var compressed = LZString.compress(uncompressed);
    var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
      var current_value = compressed.charCodeAt(i);
      buf[i*2] = current_value >>> 8;
      buf[i*2+1] = current_value % 256;
    }
    return buf;
  },

  //decompress from uint8array (UCS-2 big endian format)
  decompressFromUint8Array:function (compressed) {
    if (compressed===null || compressed===undefined){
        return LZString.decompress(compressed);
    } else {
        var buf=new Array(compressed.length/2); // 2 bytes per character
        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
          buf[i]=compressed[i*2]*256+compressed[i*2+1];
        }

        var result = [];
        buf.forEach(function (c) {
          result.push(f(c));
        });
        return LZString.decompress(result.join(''));

    }

  },


  //compress into a string that is already URI encoded
  compressToEncodedURIComponent: function (input) {
    if (input == null) return "";
    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
  },

  //decompress from an output of compressToEncodedURIComponent
  decompressFromEncodedURIComponent:function (input) {
    if (input == null) return "";
    if (input == "") return null;
    input = input.replace(/ /g, "+");
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
  },

  compress: function (uncompressed) {
    return LZString._compress(uncompressed, 16, function(a){return f(a);});
  },
  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary= {},
        context_dictionaryToCreate= {},
        context_c="",
        context_wc="",
        context_w="",
        context_enlargeIn= 2, // Compensate for the first entry which should not count
        context_dictSize= 3,
        context_numBits= 2,
        context_data=[],
        context_data_val=0,
        context_data_position=0,
        ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
          if (context_w.charCodeAt(0)<256) {
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<8 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position ==bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<16 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }


        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        // Add wc to the dictionary.
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    // Output the code for w.
    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
        if (context_w.charCodeAt(0)<256) {
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<8 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<16 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }


      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    // Mark the end of the stream
    value = 2;
    for (i=0 ; i<context_numBits ; i++) {
      context_data_val = (context_data_val << 1) | (value&1);
      if (context_data_position == bitsPerChar-1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    // Flush the last char
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == bitsPerChar-1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      }
      else context_data_position++;
    }
    return context_data.join('');
  },

  decompress: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
  },

  _decompress: function (length, resetValue, getNextValue) {
    var dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = {val:getNextValue(0), position:resetValue, index:1};

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2,2);
    power=1;
    while (power!=maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb>0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2,numBits);
      power=1;
      while (power!=maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb>0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 2:
          return result.join('');
      }

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

    }
  }
};
  return LZString;
})();

if (typeof define === 'function' && define.amd) {
  define(function () { return LZString; });
} else if( typeof module !== 'undefined' && module != null ) {
  module.exports = LZString
} else if( typeof angular !== 'undefined' && angular != null ) {
  angular.module('LZString', [])
  .factory('LZString', function () {
    return LZString;
  });
}

try{ if (typeof LZString !== "undefined" && window) window.LZString = LZString; }catch(e){}
}).call(window);

// ---- bz-codec ----
/* bz-codec —— 线协议编解码（与 gateway/src/codec.js 管线一致，已实机对撞验证）
 * 依赖构建期注入的 window.aesjs / window.LZString */
;(function () {
  try {
    var A = window.aesjs, LZ = window.LZString;
    if (!A || !LZ) { window.__BZ_CODEC__ = null; return; }
    var KEY = A.utils.utf8.toBytes('120734aa834dea925ca8d2e1bb6811c3'); // 32B → AES-256-CBC（实测定稿）
    var IV = A.utils.utf8.toBytes('33daee8409834c00');

    function pkcs7Pad(b) {
      var n = 16 - (b.length % 16);
      var o = new Uint8Array(b.length + n);
      o.set(b);
      for (var i = b.length; i < o.length; i++) o[i] = n;
      return o;
    }
    function pkcs7Unpad(b) {
      if (!b || !b.length) return b;
      var n = b[b.length - 1];
      return b.slice(0, b.length - n);
    }
    /** 明文 JSON → Hex 密文 */
    function encode(plaintext) {
      var b64 = LZ.compressToBase64(plaintext);
      var data = A.utils.utf8.toBytes(b64);
      var cbc = new A.ModeOfOperation.cbc(KEY, IV);
      return A.utils.hex.fromBytes(cbc.encrypt(pkcs7Pad(data)));
    }
    /** Hex 密文 → 明文 JSON；失败抛错（调用方走黑洞/兜底） */
    function decode(hex) {
      var raw = A.utils.hex.toBytes(String(hex).trim());
      var cbc = new A.ModeOfOperation.cbc(KEY, IV);
      var b64 = A.utils.utf8.fromBytes(pkcs7Unpad(cbc.decrypt(raw)));
      var s = LZ.decompressFromBase64(b64);
      if (s === null || s === undefined) throw new Error('LZString 解压失败');
      return s;
    }
    window.__BZ_CODEC__ = { encode: encode, decode: decode };
  } catch (e) {
    try { console.log('[BZ-OFFLINE] codec 初始化失败: ' + e); } catch (_) {}
    window.__BZ_CODEC__ = null;
  }
})();

// ---- bz-xhr（传输层） ----
/* bz-xhr —— 进程内环回 XHR（纯传输层）
 *
 * 设计约束（来自"机制/策略分离"）：本文件只负责 XHR 语义，不含任何业务应答逻辑。
 * 每次 send 都通过 getImpl() 动态取当前实现，因此替换 impl 对已存在的实例同样生效。
 * XHR 一致性对齐规范：OPENED→HEADERS_RECEIVED→LOADING→DONE 会逐个触发 readystatechange，
 * 且 on<event> 属性、addEventListener 两种注册方式都会收到事件。
 */
;(function (root) {
  'use strict';

  function createBzXHRClass(getImpl, log) {
    log = log || function () {};

    function mkEvent(self, name) {
      return { type: name, target: self, currentTarget: self };
    }

    /** 客户端回调抛错时，把调用栈里那几帧的“函数源码”抓出来
     *  （V8 支持 Error.prepareStackTrace → CallSite.getFunction() → String(fn)）
     *  这样不用猜字段名，直接读消费端代码。 */
    function reportHandlerError(name, err) {
      log('事件回调异常(' + name + '): ' + err);
      var frames = null;
      try {
        var prev = Error.prepareStackTrace;
        Error.prepareStackTrace = function (er, s) { frames = s; return ''; };
        void err.stack;
        Error.prepareStackTrace = prev || null;
      } catch (e2) { try { Error.prepareStackTrace = null; } catch (e3) {} }
      if (!frames) return;
      var shown = 0;
      for (var i = 0; i < frames.length && shown < 3; i++) {
        var f = null, fnName = '?', loc = '?';
        try { f = frames[i].getFunction(); } catch (e) {}
        try { fnName = frames[i].getFunctionName() || '(anon)'; } catch (e) {}
        try { loc = frames[i].getFileName() + ':' + frames[i].getLineNumber(); } catch (e) {}
        if (!f) { log('frame ' + i + ' ' + fnName + ' @ ' + loc + ' (no fn ref)'); continue; }
        shown++;
        var src = '';
        try { src = String(f); } catch (e) { src = '?'; }
        log('frame ' + i + ' ' + fnName + ' @ ' + loc + ' SRC>>> ' + src.slice(0, 4000));
      }
    }

    function BzXHR() {
      var self = this;
      this.readyState = 0; this.status = 0; this.statusText = '';
      this.response = ''; this.responseText = ''; this.responseType = '';
      this.responseURL = ''; this.responseXML = null;
      this.timeout = 0; this.withCredentials = false;
      this.onreadystatechange = null; this.onload = null; this.onerror = null;
      this.onabort = null; this.ontimeout = null; this.onloadend = null; this.onprogress = null;
      this._listeners = {}; this._headers = {};
      this._method = 'GET'; this._url = ''; this._aborted = false; this._failed = false;

      function fire(name) {
        var e = mkEvent(self, name);
        var hs = [];
        try { if (typeof self['on' + name] === 'function') hs.push(self['on' + name]); } catch (err) {}
        var a = self._listeners[name];
        if (a) for (var i = 0; i < a.length; i++) hs.push(a[i]);
        for (var j = 0; j < hs.length; j++) {
          try { hs[j].call(self, e); } catch (err) { reportHandlerError(name, err); }
        }
      }
      this._fire = fire; // 供测试/调试

      this.open = function (method, url) {
        self._method = String(method || 'GET').toUpperCase();
        self._url = String(url == null ? '' : url);
        self._headers = {}; self._aborted = false; self._failed = false;
        self.status = 0; self.statusText = ''; self.responseText = ''; self.response = '';
        self.readyState = 1; fire('readystatechange');
      };
      this.setRequestHeader = function (k, v) { self._headers[String(k).toLowerCase()] = String(v); };
      this.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
      this.getResponseHeader = function (k) {
        return /^content-type$/i.test(String(k)) ? 'application/json' : null;
      };
      this.overrideMimeType = function () {};
      this.addEventListener = function (n, f) { (self._listeners[n] = self._listeners[n] || []).push(f); };
      this.removeEventListener = function (n, f) {
        var a = self._listeners[n] || []; var i = a.indexOf(f); if (i >= 0) a.splice(i, 1);
      };
      this.abort = function () {
        self._aborted = true; self.status = 0; self.readyState = 4; fire('abort'); fire('loadend');
      };

      this.send = function (body) {
        if (self._aborted) return;
        var t0 = Date.now();
        var req = {
          method: self._method, url: self._url,
          body: body === undefined ? null : body,
          headers: self._headers, t: t0,
        };
        var res = null;
        try {
          var impl = getImpl();
          if (!impl || typeof impl.handle !== 'function') throw new Error('impl 未就绪');
          res = impl.handle(req) || {};
        } catch (e) {
          self._failed = true;
          log('ERR impl.handle 异常: ' + (e && e.stack ? e.stack : e));
          res = { status: 500, statusText: 'IMPL ERROR', text: JSON.stringify({ error: String(e && e.message ? e.message : e) }) };
        }        var deliver = function () {
          if (self._aborted) return;
          var dt = Date.now() - t0;
          self.status = res.status || 200;
          self.statusText = res.statusText || (self._failed ? 'IMPL ERROR' : 'OK');
          self.responseText = res.text == null ? '' : String(res.text);
          self.response = self.responseText;
          self.responseURL = self._url;
          self.readyState = 2; fire('readystatechange');
          self.readyState = 3; fire('readystatechange');
          self.readyState = 4; fire('readystatechange');
          if (self._failed) { fire('error'); fire('loadend'); return; }
          try { fire('progress'); } catch (e) {}
          fire('load'); fire('loadend');
          if (res.meta) { try { log('xhr ' + (res.meta.action || '?') + ' ' + dt + 'ms ' + (res.text || '').length + 'B'); } catch (e) {} }
        };
        if (typeof setTimeout === 'function') setTimeout(deliver, 0); else deliver();
      };
    }

    BzXHR.UNSENT = 0; BzXHR.OPENED = 1; BzXHR.HEADERS_RECEIVED = 2; BzXHR.LOADING = 3; BzXHR.DONE = 4;
    return BzXHR;
  }

  root.createBzXHRClass = createBzXHRClass;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createBzXHRClass: createBzXHRClass };
})(typeof window !== 'undefined' ? window : this);

// ---- bz-bootstrap（薄引导） ----
/* bz-bootstrap —— 薄引导（几乎永不改）
 *
 * 只做五件事：
 *   1. 命令通道（文件：bz_cmd.txt → bz_res.txt），额外支持 reload / ver / selfcheck / reset / log / scene
 *   2. XHR 替换（所有方法转发到 globalThis.__BZ_HARNESS__.impl，间接层）
 *   3. 全局错误捕获（window.onerror / unhandledrejection / console.error / cc.error）→ JSONL 日志
 *   4. 场景变化记录 + ready 标记文件（bz_ready.json）
 *   5. 从 <writable>/hotfix/live/handlers.js 载入策略层，可 reload 热替换
 *
 * 契约：handlers.js 通过 new Function('bz', src) 求值，必须 return
 *   { version, handle(req) -> {status,text,meta}, selfCheck() -> {ok,...}, reset() }
 * 任何异常都不得阻断引擎加载。
 */
;(function () {
  'use strict';
  if (window.__BZ_BOOT__) return;

  var BOOT_VER = 'boot-2';
  var H = {
    bootVer: BOOT_VER, implVer: '(none)', flowVer: '(none)', impl: null, flow: null,
    implError: null, flowError: null,
    startedAt: Date.now(), logBuf: [], rpc: 0, scene: '', filesReady: false,
  };
  window.__BZ_BOOT__ = H;
  window.__BZ_HARNESS__ = H;

  var utils = null, DIR = '';
  function consoleLine(s) { try { console.log('[BZ] ' + s); } catch (e) {} }

  // ---------- 日志：JSONL 全量落盘 + 内存环形 ----------
  function log(rec) {
    var e = { t: Date.now(), boot: BOOT_VER, impl: H.implVer, flow: H.flowVer };
    if (rec && typeof rec === 'object') { for (var k in rec) if (rec.hasOwnProperty(k)) e[k] = rec[k]; }
    else e.msg = String(rec);
    H.logBuf.push(e);
    if (H.logBuf.length > 400) H.logBuf.shift();
    try { if (FILE_LOG) utils.writeStringToFile(H.logBuf.map(function (x) { return JSON.stringify(x); }).join('\n') + '\n', FILE_LOG); } catch (_) {}
    if (e.kind !== 'xhr') consoleLine(JSON.stringify(e));
  }
  var FILE_LOG = '';

  // ---------- 策略层 API（交给 handlers.js） ----------
  function api() {
    return {
      bootVer: BOOT_VER,
      now: function () { return Date.now(); },
      log: function (m) { log({ kind: 'impl', msg: String(m) }); },
      readFile: function (p) {
        try { return (utils && utils.isFileExist(p)) ? utils.getStringFromFile(p) : null; } catch (e) { return null; }
      },
      writeFile: function (p, t) {
        try { utils.writeStringToFile(String(t), p); return true; } catch (e) { log({ kind: 'err', msg: 'writeFile 失败 ' + p + ': ' + e }); return false; }
      },
      exists: function (p) { try { return !!(utils && utils.isFileExist(p)); } catch (e) { return false; } },
      remove: function (p) { try { return !!(utils && utils.removeFile && utils.removeFile(p)); } catch (e) { return false; } },
      codec: window.__BZ_CODEC__,
      dir: DIR,
      savePath: DIR + 'bz_offline_save.json',
      handlersPath: DIR + 'hotfix/live/handlers.js',
    };
  }

  // ---------- 载入 / 热替换策略层 ----------
  var HANDLERS = '';
  var HANDLERS_FALLBACK = ['hotfix/live/handlers.js', 'hotfix/handlers.js'];

  function loadImpl() {
    var lastErr = null;
    for (var i = 0; i < HANDLERS_FALLBACK.length; i++) {
      var p = DIR + HANDLERS_FALLBACK[i];
      var src = api().readFile(p);
      if (!src) { lastErr = lastErr || ('handlers.js 不存在: ' + p); continue; }
      try {
        var f = new Function('bz', src);
        var impl = f(api());
        if (!impl || typeof impl.handle !== 'function') throw new Error('impl 契约不符（缺 handle）');
        H.impl = impl;
        H.implVer = String(impl.version || '?');
        H.implError = null;
        HANDLERS = p;
        return impl;
      } catch (e) { lastErr = String(e && e.stack ? e.stack : e); }
    }
    H.implError = lastErr;
    throw new Error(lastErr || 'handlers 载入失败');
  }

  // ---------- 载入 / 热替换流程层（flow.js：自动登录/建档/进场景） ----------
  function hash32(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function loadFlow() {
    var p = DIR + 'hotfix/live/flow.js';
    var src = api().readFile(p);
    if (!src) { H.flowError = 'flow.js 不存在: ' + p; H.flow = null; H.flowVer = '(none)'; return null; }
    var f = new Function('bz', src);
    var flow = f(api());
    if (!flow || typeof flow.onTick !== 'function') throw new Error('flow 契约不符（缺 onTick）');
    H.flow = flow;
    H.flowVer = 'f' + hash32(src);
    H.flowError = null;
    return flow;
  }

  // ---------- 错误捕获 ----------
  function installErrorCapture() {
    try {
      var prev = window.onerror;
      window.onerror = function (msg, src, line, col, err) {
        log({ kind: 'err', src: 'window.onerror', msg: String(msg), file: String(src || ''), line: line, col: col, stack: err && err.stack ? String(err.stack).slice(0, 1500) : null });
        if (typeof prev === 'function') { try { return prev.apply(this, arguments); } catch (e) {} }
        return false;
      };
      if (window.addEventListener) {
        window.addEventListener('unhandledrejection', function (e) {
          var r = e && e.reason;
          log({ kind: 'err', src: 'unhandledrejection', msg: String(r && r.message ? r.message : r), stack: r && r.stack ? String(r.stack).slice(0, 1500) : null });
        });
      }
      var ce = console.error;
      console.error = function () {
        try { log({ kind: 'err', src: 'console.error', msg: Array.prototype.map.call(arguments, function (a) { return String(a); }).join(' ').slice(0, 800) }); } catch (e) {}
        if (typeof ce === 'function') { try { return ce.apply(console, arguments); } catch (e) {} }
      };
      if (window.cc && typeof cc.error === 'function') {
        var cce = cc.error;
        cc.error = function () {
          try { log({ kind: 'err', src: 'cc.error', msg: Array.prototype.map.call(arguments, function (a) { return String(a); }).join(' ').slice(0, 800) }); } catch (e) {}
          return cce.apply(cc, arguments);
        };
      }
    } catch (e) { consoleLine('installErrorCapture 异常: ' + e); }
  }

  // ---------- XHR 替换（无条件，尽早） ----------
  function installXHR() {
    try {
      if (typeof window.createBzXHRClass !== 'function') { consoleLine('bz-xhr 未加载'); return; }
      window.XMLHttpRequest = window.createBzXHRClass(
        function () { return H.impl; },
        function (m) { log({ kind: 'xhr', msg: String(m) }); }
      );
      log({ kind: 'info', msg: 'XMLHttpRequest → 进程内环回（间接层 __BZ_HARNESS__.impl）' });
    } catch (e) { consoleLine('installXHR 异常: ' + e); }
  }

  // ---------- 命令通道 ----------
  function installCommandChannel() {
    var cmdPath = DIR + 'bz_cmd.txt', resPath = DIR + 'bz_res.txt', seqPath = DIR + 'bz_res_seq.txt';
    function reply(t) { try { utils.writeStringToFile(String(t) + '\n<<DONE>>', resPath); } catch (e) {} }
    function trunc(v) {
      var s;
      try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { s = String(v); }
      if (s === undefined) s = String(v);
      return s.length > 4000 ? s.slice(0, 4000) + '...<truncated>' : s;
    }
    function exec(cmd) {
      cmd = String(cmd || '').trim();
      if (!cmd) return 'EMPTY';
      var m = cmd.match(/^(\w+):([\s\S]*)$/);
      var op = m ? m[1] : cmd, arg = m ? m[2] : '';
      try {
        if (op === 'keys') {
          var out = [];
          Object.getOwnPropertyNames(window).forEach(function (k) {
            var t; try { t = typeof window[k]; } catch (e) { t = '?'; }
            out.push(k + ':' + t);
          });
          return out.join('\n');
        }
        if (op === 'ver') return JSON.stringify({ boot: H.bootVer, impl: H.implVer, flow: H.flowVer, rpc: H.rpc, scene: H.scene, implErr: H.implError && String(H.implError).slice(0, 200), flowErr: H.flowError && String(H.flowError).slice(0, 200) });
        if (op === 'reload') {
          var t0 = Date.now();
          var res = { ok: true, impl: H.implVer, flow: H.flowVer, ms: 0 };
          try {
            var sc = null;
            loadImpl();
            res.impl = H.implVer;
            if (H.impl.selfCheck) sc = H.impl.selfCheck();
            try { loadFlow(); res.flow = H.flowVer; } catch (e2) { res.flowError = String(e2); }
            res.ms = Date.now() - t0;
            res.selfCheck = sc;
            log({ kind: 'reload', impl: H.implVer, flow: H.flowVer, ok: true, ms: res.ms });
            return JSON.stringify(res);
          } catch (e) {
            log({ kind: 'reload', ok: false, err: String(e) });
            return 'ERR reload: ' + (e && e.stack ? e.stack : e);
          }
        }
        if (op === 'selfcheck') return trunc(H.impl && H.impl.selfCheck ? H.impl.selfCheck() : 'no impl');
        if (op === 'reset') return trunc(H.impl && H.impl.reset ? H.impl.reset() : 'no impl');
        if (op === 'state') return trunc(H.impl && H.impl.state ? H.impl.state() : 'no impl');
        if (op === 'log') return trunc(H.logBuf.slice(-(parseInt(arg, 10) || 20)));
        if (op === 'scene') {
          var sc2 = window.cc && cc.director && cc.director.getScene();
          return trunc(sc2 ? sc2.name : 'null');
        }
        if (op === 'get' || op === 'call') return trunc(eval(arg));
        if (op === 'dump') {
          var o = eval(arg), lines = [];
          Object.keys(o || {}).forEach(function (k) {
            var t; try { t = typeof o[k]; } catch (e) { t = '?'; }
            var v; try { v = t === 'function' ? '[fn]' : String(o[k]).slice(0, 80); } catch (e) { v = '?'; }
            lines.push(k + ' (' + t + ') = ' + v);
          });
          return lines.join('\n');
        }
        if (op === 'eval') { eval(arg); return 'OK'; }
        return 'UNKNOWN_OP ' + op;
      } catch (e) { return 'ERR ' + (e && e.stack ? e.stack : e); }
    }
    // 启动时丢弃上一次会话残留的命令文件（坑 29：残留命令会在每次启动时重放，
    // 上一条探针若是死循环，就会连续 ANR，看着像"游戏自己崩"）。
    // 策略：残留内容搬到 bz_cmd.stale.txt 留档 + 删除原文件；只有本次启动之后写入的命令才会被执行。
    (function discardStaleCmd() {
      try {
        if (!utils.isFileExist(cmdPath)) return;
        var stale = '';
        try { stale = String(utils.getStringFromFile(cmdPath) || ''); } catch (e) {}
        try { utils.writeStringToFile(stale, DIR + 'bz_cmd.stale.txt'); } catch (e) {}
        try { utils.removeFile(cmdPath); } catch (e) {}
        var still = false;
        try { still = utils.isFileExist(cmdPath); } catch (e) {}
        log({ kind: 'info', msg: '启动时丢弃残留命令（' + stale.length + 'B，' + (still ? '删除失败' : '已删除') + '，内容已留档 bz_cmd.stale.txt）：' + stale.slice(0, 200) });
      } catch (e) {}
    })();

    setInterval(function () {
      var c = null;
      try { c = utils.isFileExist(cmdPath) ? utils.getStringFromFile(cmdPath) : null; } catch (e) {}
      if (c === null) return;
      try { utils.removeFile(cmdPath); } catch (e) {}
      // 删不掉就绝不再执行：否则文件留在盘上，这个 700ms 定时器会无限重放同一条命令
      var stubborn = false;
      try { stubborn = utils.isFileExist(cmdPath); } catch (e) {}
      if (stubborn) {
        try { utils.writeStringToFile('', cmdPath); } catch (e) {}
        if (!H._cmdStubbornAt || Date.now() - H._cmdStubbornAt > 5000) {
          H._cmdStubbornAt = Date.now();
          log({ kind: 'err', src: 'cmd', msg: '命令文件删不掉，已拒绝执行（避免定时器重放）：' + String(c).slice(0, 200) });
        }
        return;
      }
      reply(exec(c));
      try { utils.writeStringToFile(String(Date.now()), seqPath); } catch (e) {}
    }, 700);
    log({ kind: 'info', msg: '命令通道就绪 ' + cmdPath + ' → ' + resPath });
  }

  // ---------- 场景观察 + 就绪标记 ----------
  function startSceneWatch() {
    setInterval(function () {
      try {
        var sc = window.cc && cc.director && cc.director.getScene();
        if (sc && sc.name !== H.scene) {
          H.scene = sc.name;
          log({ kind: 'scene', name: sc.name });
          markReady('scene:' + H.scene);
        }
        if (sc && H.flow) {
          try {
            var r = H.flow.onTick(sc, api());
            if (r) log({ kind: 'flow', msg: String(r).slice(0, 300) });
          } catch (e) {
            if (!H._flowErrAt || Date.now() - H._flowErrAt > 3000) {
              H._flowErrAt = Date.now();
              log({ kind: 'err', src: 'flow', msg: String(e && e.message ? e.message : e), stack: e && e.stack ? String(e.stack).slice(0, 800) : null });
            }
          }
        }
      } catch (e) {}
    }, 500);
  }

  function markReady(why) {
    try {
      api().writeFile(DIR + 'bz_ready.json', JSON.stringify({ t: Date.now(), boot: H.bootVer, impl: H.implVer, flow: H.flowVer, scene: H.scene, why: why }));
    } catch (e) {}
  }

  // ---------- 等文件系统就绪后初始化 ----------
  function initFiles() {
    utils = window.jsb && jsb.fileUtils;
    if (!utils) return false;
    DIR = utils.getWritablePath();
    FILE_LOG = DIR + 'bz_log.jsonl';
    H.filesReady = true;
    log({ kind: 'info', msg: 'bootstrap ' + BOOT_VER + ' 文件系统就绪 ' + DIR });
    try { loadImpl(); log({ kind: 'info', msg: '策略层载入 ' + H.implVer }); }
    catch (e) { log({ kind: 'err', msg: '策略层载入失败: ' + e }); }
    try { loadFlow(); log({ kind: 'info', msg: '流程层载入 ' + H.flowVer }); }
    catch (e) { log({ kind: 'err', msg: '流程层载入失败: ' + e }); }
    installCommandChannel();
    startSceneWatch();
    markReady('boot');
    return true;
  }

  // XHR 与错误捕获不依赖文件系统，立刻装；文件相关等 jsb 就绪（100ms 轮询，最多 30s）
  installErrorCapture();
  installXHR();
  try { FILE_LOG = ''; } catch (e) {}

  var tries = 0;
  (function waitFs() {
    try { if (initFiles()) return; } catch (e) { consoleLine('initFiles 异常: ' + e); }
    if (++tries > 300) { consoleLine('等 jsb.fileUtils 超时（30s），文件相关功能不可用'); return; }
    setTimeout(waitFs, 100);
  })();

  consoleLine('bootstrap ' + BOOT_VER + ' 安装完成');
})();


(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports={
  "O_RDONLY": 0,
  "O_WRONLY": 1,
  "O_RDWR": 2,
  "S_IFMT": 61440,
  "S_IFREG": 32768,
  "S_IFDIR": 16384,
  "S_IFCHR": 8192,
  "S_IFBLK": 24576,
  "S_IFIFO": 4096,
  "S_IFLNK": 40960,
  "S_IFSOCK": 49152,
  "O_CREAT": 512,
  "O_EXCL": 2048,
  "O_NOCTTY": 131072,
  "O_TRUNC": 1024,
  "O_APPEND": 8,
  "O_DIRECTORY": 1048576,
  "O_NOFOLLOW": 256,
  "O_SYNC": 128,
  "O_SYMLINK": 2097152,
  "O_NONBLOCK": 4,
  "S_IRWXU": 448,
  "S_IRUSR": 256,
  "S_IWUSR": 128,
  "S_IXUSR": 64,
  "S_IRWXG": 56,
  "S_IRGRP": 32,
  "S_IWGRP": 16,
  "S_IXGRP": 8,
  "S_IRWXO": 7,
  "S_IROTH": 4,
  "S_IWOTH": 2,
  "S_IXOTH": 1,
  "E2BIG": 7,
  "EACCES": 13,
  "EADDRINUSE": 48,
  "EADDRNOTAVAIL": 49,
  "EAFNOSUPPORT": 47,
  "EAGAIN": 35,
  "EALREADY": 37,
  "EBADF": 9,
  "EBADMSG": 94,
  "EBUSY": 16,
  "ECANCELED": 89,
  "ECHILD": 10,
  "ECONNABORTED": 53,
  "ECONNREFUSED": 61,
  "ECONNRESET": 54,
  "EDEADLK": 11,
  "EDESTADDRREQ": 39,
  "EDOM": 33,
  "EDQUOT": 69,
  "EEXIST": 17,
  "EFAULT": 14,
  "EFBIG": 27,
  "EHOSTUNREACH": 65,
  "EIDRM": 90,
  "EILSEQ": 92,
  "EINPROGRESS": 36,
  "EINTR": 4,
  "EINVAL": 22,
  "EIO": 5,
  "EISCONN": 56,
  "EISDIR": 21,
  "ELOOP": 62,
  "EMFILE": 24,
  "EMLINK": 31,
  "EMSGSIZE": 40,
  "EMULTIHOP": 95,
  "ENAMETOOLONG": 63,
  "ENETDOWN": 50,
  "ENETRESET": 52,
  "ENETUNREACH": 51,
  "ENFILE": 23,
  "ENOBUFS": 55,
  "ENODATA": 96,
  "ENODEV": 19,
  "ENOENT": 2,
  "ENOEXEC": 8,
  "ENOLCK": 77,
  "ENOLINK": 97,
  "ENOMEM": 12,
  "ENOMSG": 91,
  "ENOPROTOOPT": 42,
  "ENOSPC": 28,
  "ENOSR": 98,
  "ENOSTR": 99,
  "ENOSYS": 78,
  "ENOTCONN": 57,
  "ENOTDIR": 20,
  "ENOTEMPTY": 66,
  "ENOTSOCK": 38,
  "ENOTSUP": 45,
  "ENOTTY": 25,
  "ENXIO": 6,
  "EOPNOTSUPP": 102,
  "EOVERFLOW": 84,
  "EPERM": 1,
  "EPIPE": 32,
  "EPROTO": 100,
  "EPROTONOSUPPORT": 43,
  "EPROTOTYPE": 41,
  "ERANGE": 34,
  "EROFS": 30,
  "ESPIPE": 29,
  "ESRCH": 3,
  "ESTALE": 70,
  "ETIME": 101,
  "ETIMEDOUT": 60,
  "ETXTBSY": 26,
  "EWOULDBLOCK": 35,
  "EXDEV": 18,
  "SIGHUP": 1,
  "SIGINT": 2,
  "SIGQUIT": 3,
  "SIGILL": 4,
  "SIGTRAP": 5,
  "SIGABRT": 6,
  "SIGIOT": 6,
  "SIGBUS": 10,
  "SIGFPE": 8,
  "SIGKILL": 9,
  "SIGUSR1": 30,
  "SIGSEGV": 11,
  "SIGUSR2": 31,
  "SIGPIPE": 13,
  "SIGALRM": 14,
  "SIGTERM": 15,
  "SIGCHLD": 20,
  "SIGCONT": 19,
  "SIGSTOP": 17,
  "SIGTSTP": 18,
  "SIGTTIN": 21,
  "SIGTTOU": 22,
  "SIGURG": 16,
  "SIGXCPU": 24,
  "SIGXFSZ": 25,
  "SIGVTALRM": 26,
  "SIGPROF": 27,
  "SIGWINCH": 28,
  "SIGIO": 23,
  "SIGSYS": 12,
  "SSL_OP_ALL": 2147486719,
  "SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION": 262144,
  "SSL_OP_CIPHER_SERVER_PREFERENCE": 4194304,
  "SSL_OP_CISCO_ANYCONNECT": 32768,
  "SSL_OP_COOKIE_EXCHANGE": 8192,
  "SSL_OP_CRYPTOPRO_TLSEXT_BUG": 2147483648,
  "SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS": 2048,
  "SSL_OP_EPHEMERAL_RSA": 0,
  "SSL_OP_LEGACY_SERVER_CONNECT": 4,
  "SSL_OP_MICROSOFT_BIG_SSLV3_BUFFER": 32,
  "SSL_OP_MICROSOFT_SESS_ID_BUG": 1,
  "SSL_OP_MSIE_SSLV2_RSA_PADDING": 0,
  "SSL_OP_NETSCAPE_CA_DN_BUG": 536870912,
  "SSL_OP_NETSCAPE_CHALLENGE_BUG": 2,
  "SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG": 1073741824,
  "SSL_OP_NETSCAPE_REUSE_CIPHER_CHANGE_BUG": 8,
  "SSL_OP_NO_COMPRESSION": 131072,
  "SSL_OP_NO_QUERY_MTU": 4096,
  "SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION": 65536,
  "SSL_OP_NO_SSLv2": 16777216,
  "SSL_OP_NO_SSLv3": 33554432,
  "SSL_OP_NO_TICKET": 16384,
  "SSL_OP_NO_TLSv1": 67108864,
  "SSL_OP_NO_TLSv1_1": 268435456,
  "SSL_OP_NO_TLSv1_2": 134217728,
  "SSL_OP_PKCS1_CHECK_1": 0,
  "SSL_OP_PKCS1_CHECK_2": 0,
  "SSL_OP_SINGLE_DH_USE": 1048576,
  "SSL_OP_SINGLE_ECDH_USE": 524288,
  "SSL_OP_SSLEAY_080_CLIENT_DH_BUG": 128,
  "SSL_OP_SSLREF2_REUSE_CERT_TYPE_BUG": 0,
  "SSL_OP_TLS_BLOCK_PADDING_BUG": 512,
  "SSL_OP_TLS_D5_BUG": 256,
  "SSL_OP_TLS_ROLLBACK_BUG": 8388608,
  "ENGINE_METHOD_DSA": 2,
  "ENGINE_METHOD_DH": 4,
  "ENGINE_METHOD_RAND": 8,
  "ENGINE_METHOD_ECDH": 16,
  "ENGINE_METHOD_ECDSA": 32,
  "ENGINE_METHOD_CIPHERS": 64,
  "ENGINE_METHOD_DIGESTS": 128,
  "ENGINE_METHOD_STORE": 256,
  "ENGINE_METHOD_PKEY_METHS": 512,
  "ENGINE_METHOD_PKEY_ASN1_METHS": 1024,
  "ENGINE_METHOD_ALL": 65535,
  "ENGINE_METHOD_NONE": 0,
  "DH_CHECK_P_NOT_SAFE_PRIME": 2,
  "DH_CHECK_P_NOT_PRIME": 1,
  "DH_UNABLE_TO_CHECK_GENERATOR": 4,
  "DH_NOT_SUITABLE_GENERATOR": 8,
  "NPN_ENABLED": 1,
  "RSA_PKCS1_PADDING": 1,
  "RSA_SSLV23_PADDING": 2,
  "RSA_NO_PADDING": 3,
  "RSA_PKCS1_OAEP_PADDING": 4,
  "RSA_X931_PADDING": 5,
  "RSA_PKCS1_PSS_PADDING": 6,
  "POINT_CONVERSION_COMPRESSED": 2,
  "POINT_CONVERSION_UNCOMPRESSED": 4,
  "POINT_CONVERSION_HYBRID": 6,
  "F_OK": 0,
  "R_OK": 4,
  "W_OK": 2,
  "X_OK": 1,
  "UV_UDP_REUSEADDR": 4
}

},{}],2:[function(require,module,exports){
"use strict";

cc.Assembler2D.prototype.updateWorldVerts = function (comp) {
  var local = this._local;
  var verts = this._renderData.vDatas[0];
  var vl = local[0],
      vr = local[2],
      vb = local[1],
      vt = local[3];
  var floatsPerVert = this.floatsPerVert;
  var vertexOffset = 0; // left bottom

  verts[vertexOffset] = vl;
  verts[vertexOffset + 1] = vb;
  vertexOffset += floatsPerVert; // right bottom

  verts[vertexOffset] = vr;
  verts[vertexOffset + 1] = vb;
  vertexOffset += floatsPerVert; // left top

  verts[vertexOffset] = vl;
  verts[vertexOffset + 1] = vt;
  vertexOffset += floatsPerVert; // right top

  verts[vertexOffset] = vr;
  verts[vertexOffset + 1] = vt;
};

var _updateColor = cc.Assembler2D.prototype.updateColor;

cc.Assembler2D.prototype.updateColor = function (comp, color) {
  this._dirtyPtr[0] |= cc.Assembler.FLAG_VERTICES_OPACITY_CHANGED;

  _updateColor.call(this, comp, color);
};

},{}],3:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Assembler3D) return;

  cc.Assembler3D.updateWorldVerts = function (comp) {
    var local = this._local;
    var world = this._renderData.vDatas[0];
    var vl = local[0],
        vr = local[2],
        vb = local[1],
        vt = local[3]; // left bottom

    var floatsPerVert = this.floatsPerVert;
    var offset = 0;
    world[offset] = vl;
    world[offset + 1] = vb;
    world[offset + 2] = 0;
    offset += floatsPerVert; // right bottom

    world[offset] = vr;
    world[offset + 1] = vb;
    world[offset + 2] = 0;
    offset += floatsPerVert; // left top

    world[offset] = vl;
    world[offset + 1] = vt;
    world[offset + 2] = 0;
    offset += floatsPerVert; // right top

    world[offset] = vr;
    world[offset + 1] = vt;
    world[offset + 2] = 0;
  };
})();

},{}],4:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var RenderFlow = cc.RenderFlow;
var originInit = cc.Assembler.prototype.init;
var FLAG_VERTICES_OPACITY_CHANGED = 1 << 0;
var FLAG_VERTICES_DIRTY = 1 << 1;
var Assembler = {
  _ctor: function _ctor() {
    this._dirtyPtr = new Uint32Array(1);
    this.setDirty(this._dirtyPtr);
    this.initVertexFormat();
  },
  destroy: function destroy() {
    this._renderComp = null;
    this._effect = null;
  },
  clear: function clear() {
    this._renderData.clear();
  },
  _extendNative: function _extendNative() {
    renderer.Assembler.prototype.ctor.call(this);
  },
  initVertexFormat: function initVertexFormat() {
    var vfmt = this.getVfmt();
    if (!vfmt) return;
    this.setVertexFormat(vfmt._nativeObj);
  },
  init: function init(renderComp) {
    this._effect = [];
    originInit.call(this, renderComp);

    if (renderComp.node && renderComp.node._proxy) {
      renderComp.node._proxy.setAssembler(this);
    }
  },
  _updateRenderData: function _updateRenderData() {
    if (!this._renderComp || !this._renderComp.isValid) return;
    this.updateRenderData(this._renderComp);
    var materials = this._renderComp._materials;

    for (var i = 0; i < materials.length; i++) {
      var m = materials[i]; // TODO: find why material can be null

      if (!m) continue;
      m.getHash();
      this.updateMaterial(i, m);
    }
  },
  updateRenderData: function updateRenderData(comp) {
    comp._assembler.updateMaterial(0, comp._materials[0]);
  },
  updateMaterial: function updateMaterial(iaIndex, material) {
    var effect = material && material.effect;

    if (this._effect[iaIndex] !== effect) {
      this._effect[iaIndex] = effect;
      this.updateEffect(iaIndex, effect ? effect._nativeObj : null);
    }
  },
  updateColor: function updateColor(comp, color) {
    this._dirtyPtr[0] |= FLAG_VERTICES_OPACITY_CHANGED;
  },
  updateIADatas: function updateIADatas(iaIndex, meshIndex) {
    // When the MeshBuffer is switched, it is necessary to synchronize the iaData of the native assembler.
    this.updateMeshIndex(iaIndex, meshIndex);
    var materials = this._renderComp._materials;
    var material = materials[iaIndex] || materials[0];
    this.updateMaterial(iaIndex, material);
  }
};
cc.Assembler.FLAG_VERTICES_OPACITY_CHANGED = FLAG_VERTICES_OPACITY_CHANGED;
cc.Assembler.FLAG_VERTICES_DIRTY = FLAG_VERTICES_DIRTY;
Object.setPrototypeOf(cc.Assembler.prototype, renderer.Assembler.prototype);
cc.js.mixin(cc.Assembler.prototype, Assembler);
module.exports = Assembler;

},{}],5:[function(require,module,exports){
"use strict";

var proto = cc.Graphics.__assembler__.prototype;
var _init = proto.init;

proto.init = function (renderComp) {
  _init.call(this, renderComp);

  this.ignoreOpacityFlag();
};

proto.genBuffer = function (graphics, cverts) {
  var buffers = this.getBuffers();
  var buffer = buffers[this._bufferOffset];
  var meshbuffer = buffer.meshbuffer;
  meshbuffer.requestStatic(cverts, cverts * 3);
  this._buffer = buffer;
  meshbuffer.setNativeAssembler(this);
  return buffer;
};

var _stroke = proto.stroke;

proto.stroke = function (graphics) {
  _stroke.call(this, graphics);

  var buffer = this._buffer;
  buffer.meshbuffer.used(buffer.vertexStart, buffer.indiceStart);
};

var _fill = proto.fill;

proto.fill = function (graphics) {
  _fill.call(this, graphics);

  var buffer = this._buffer;
  buffer.meshbuffer.used(buffer.vertexStart, buffer.indiceStart);
};

var _updateIADatas = proto.updateIADatas;

proto.updateIADatas = function (iaIndex, meshIndex) {
  _updateIADatas.call(this, iaIndex, meshIndex); // Reset vertexStart and indiceStart when buffer is switched.


  this._buffer.vertexStart = 0;
  this._buffer.indiceStart = 0;
};

},{}],6:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var originReserveQuads = cc.Label.__assembler__.Bmfont.prototype._reserveQuads;
Object.assign(cc.Label.__assembler__.Bmfont.prototype, {
  updateWorldVerts: function updateWorldVerts(comp) {
    var local = this._local;
    var world = this._renderData.vDatas[0];
    var floatsPerVert = this.floatsPerVert;

    for (var offset = 0, l = local.length; offset < l; offset += floatsPerVert) {
      world[offset] = local[offset];
      world[offset + 1] = local[offset + 1];
    }
  }
});

},{}],7:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Label.__assembler__.Bmfont3D) return;
  var proto = cc.Label.__assembler__.Bmfont3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: function updateWorldVerts(comp) {
      var local = this._local;
      var world = this._renderData.vDatas[0];
      var floatsPerVert = this.floatsPerVert;

      for (var offset = 0, l = world.length; offset < l; offset += floatsPerVert) {
        world[offset] = local[offset];
        world[offset + 1] = local[offset + 1];
        world[offset + 2] = 0;
      }
    }
  });
})();

},{}],8:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Label.__assembler__.Letter3D) return;
  var proto = cc.Label.__assembler__.Letter3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: function updateWorldVerts(comp) {
      var local = this._local;
      var world = this._renderData.vDatas[0];
      var floatsPerVert = this.floatsPerVert;

      for (var offset = 0, l = world.length; offset < l; offset += floatsPerVert) {
        world[offset] = local[offset];
        world[offset + 1] = local[offset + 1];
        world[offset + 2] = 0;
      }
    }
  });
})();

},{}],9:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Label.__assembler__.TTF3D) return;
  var proto = cc.Label.__assembler__.TTF3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: cc.Assembler3D.updateWorldVerts
  });
})();

},{}],10:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
require('./2d/bmfont.js');

require('./3d/bmfont.js');

require('./3d/ttf.js');

require('./3d/letter.js');

},{"./2d/bmfont.js":6,"./3d/bmfont.js":7,"./3d/letter.js":8,"./3d/ttf.js":9}],11:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var Mask = cc.Mask;
var RenderFlow = cc.RenderFlow;
var spriteAssembler = cc.Sprite.__assembler__.Simple.prototype;
var graphicsAssembler = cc.Graphics.__assembler__.prototype;
var proto = cc.Mask.__assembler__.prototype;
var _updateRenderData = proto.updateRenderData; // Avoid constructor being overridden.

renderer.MaskAssembler.prototype.constructor = cc.Mask.__assembler__;
cc.js.mixin(proto, {
  _extendNative: function _extendNative() {
    renderer.MaskAssembler.prototype.ctor.call(this);
  },
  initLocal: function initLocal() {
    this._local = new Float32Array(4);
    renderer.MaskAssembler.prototype.setLocalData.call(this, this._local);
  },
  updateRenderData: function updateRenderData(mask) {
    _updateRenderData.call(this, mask);

    mask._clearGraphics._assembler.updateMaterial(0, mask._clearMaterial);

    this.setMaskInverted(mask.inverted);
    this.setUseModel(mask._type !== Mask.Type.IMAGE_STENCIL);
    this.setImageStencil(mask._type === Mask.Type.IMAGE_STENCIL);

    if (mask._graphics) {
      mask._graphics._assembler.setUseModel(mask._type !== Mask.Type.IMAGE_STENCIL);
    }

    mask.node._renderFlag |= cc.RenderFlow.FLAG_UPDATE_RENDER_DATA;
  }
}, renderer.MaskAssembler.prototype);
var originCreateGraphics = cc.Mask.prototype._createGraphics;
var originRemoveGraphics = cc.Mask.prototype._removeGraphics;
cc.js.mixin(cc.Mask.prototype, {
  _createGraphics: function _createGraphics() {
    originCreateGraphics.call(this);

    if (this._graphics) {
      this._assembler.setRenderSubHandle(this._graphics._assembler);
    } // TODO: remove clearGraphics


    if (!this._clearGraphics) {
      this._clearGraphics = new cc.Graphics();
      cc.Assembler.init(this._clearGraphics);
      this._clearGraphics.node = new cc.Node();

      this._clearGraphics._activateMaterial();

      this._clearGraphics.lineWidth = 0;

      this._clearGraphics.rect(-1, -1, 2, 2);

      this._clearGraphics.fill();

      this._clearGraphics._assembler.ignoreWorldMatrix();

      this._assembler.setClearSubHandle(this._clearGraphics._assembler);
    }
  },
  _removeGraphics: function _removeGraphics() {
    originRemoveGraphics.call(this); // TODO: remove clearGraphics

    if (this._clearGraphics) {
      this._clearGraphics.destroy();

      this._clearGraphics = null;
    }
  }
});

},{}],12:[function(require,module,exports){
"use strict";

(function () {
  var Mesh = cc.MeshRenderer;
  if (Mesh === undefined) return;
  var proto = cc.MeshRenderer.__assembler__.prototype;
  var _init = proto.init;
  cc.js.mixin(proto, {
    initVertexFormat: function initVertexFormat() {},
    _extendNative: function _extendNative() {
      renderer.MeshAssembler.prototype.ctor.call(this);
    },
    init: function init(comp) {
      _init.call(this, comp);

      this.updateMeshData(true);
    },
    setRenderNode: function setRenderNode(node) {
      this.setNode(node._proxy);
    },
    updateRenderData: function updateRenderData(comp) {
      this.updateMeshData();
      comp.node._renderFlag |= cc.RenderFlow.FLAG_UPDATE_RENDER_DATA;
    },
    updateMeshData: function updateMeshData(force) {
      var comp = this._renderComp;
      var mesh = comp.mesh;
      if (!mesh || !mesh.loaded) return;
      var subdatas = comp.mesh.subDatas;

      for (var i = 0, len = subdatas.length; i < len; i++) {
        var data = subdatas[i];

        if (force || data.vDirty || data.iDirty) {
          this.updateIAData(i, data.vfm._nativeObj, data.vData, data.iData);
          data.vDirty = false;
          data.iDirty = false;
        }
      }
    }
  }, renderer.MeshAssembler.prototype);
})();

},{}],13:[function(require,module,exports){
"use strict";

var proto = cc.MotionStreak.__assembler__.prototype;
var _init = proto.init;
var _update = proto.update;
cc.js.mixin(proto, {
  init: function init(comp) {
    _init.call(this, comp);

    this.setUseModel(false);
    this.ignoreWorldMatrix();
    this.ignoreOpacityFlag();
  },
  update: function update(comp, dt) {
    comp.node._updateWorldMatrix();

    _update.call(this, comp, dt);

    var _this$_renderData$_fl = this._renderData._flexBuffer,
        iData = _this$_renderData$_fl.iData,
        usedVertices = _this$_renderData$_fl.usedVertices;
    var indiceOffset = 0;

    for (var i = 0, l = usedVertices; i < l; i += 2) {
      iData[indiceOffset++] = i;
      iData[indiceOffset++] = i + 2;
      iData[indiceOffset++] = i + 1;
      iData[indiceOffset++] = i + 1;
      iData[indiceOffset++] = i + 2;
      iData[indiceOffset++] = i + 3;
    }
  }
});

},{}],14:[function(require,module,exports){
"use strict";

(function () {
  var PS = cc.ParticleSystem3D;
  if (PS === undefined) return;
  var proto = PS.__assembler__.prototype;
  var _init = proto.init;
  var _updateRenderData = proto.updateRenderData;
  cc.js.mixin(proto, {
    initVertexFormat: function initVertexFormat() {},
    _extendNative: function _extendNative() {
      renderer.Particle3DAssembler.prototype.ctor.call(this);
    },
    init: function init(comp) {
      _init.call(this, comp);

      this._renderDataList = new renderer.RenderDataList();
      this.setRenderDataList(this._renderDataList);
      this.ignoreOpacityFlag();
      this.updateMeshData();
      this.setUseModel(true);
    },
    updateRenderData: function updateRenderData(comp) {
      _updateRenderData.call(this, comp);

      if (comp._vertsDirty) {
        this.updateMeshData();
        comp._vertsDirty = false;
      }
    },
    setRenderNode: function setRenderNode(node) {
      this.setNode(node._proxy);
    },
    updateMeshData: function updateMeshData() {
      if (!this._model) {
        return;
      }

      var subdatas = this._model._subDatas;

      for (var i = 0, len = subdatas.length; i < len; i++) {
        var data = subdatas[i];

        if (data.vDirty && data.enable) {
          this._renderDataList.updateMesh(i, data.vData, data.iData);
        }
      }

      this.setVertexFormat(subdatas[0].vfm._nativeObj);
      this.setSimulationSpace(this._particleSystem.simulationSpace);

      if (subdatas[1] && subdatas[1].enable) {
        this.setTrailVertexFormat(subdatas[1].vfm._nativeObj);
        this.setTrailModuleSpace(this._particleSystem.trailModule.space);
      }
    },
    setSimulationSpace: function setSimulationSpace(space) {
      this.setParticleSpace(space);
    },
    setTrailModuleSpace: function setTrailModuleSpace(space) {
      this.setTrailSpace(space);
    },
    updateIA: function updateIA(index, count, vDirty, iDirty) {
      this.updateIndicesRange(index, 0, count);
    }
  }, renderer.Particle3DAssembler.prototype);
})();

},{}],15:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
Object.assign(cc.Sprite.__assembler__.Mesh.prototype, {
  updateWorldVerts: function updateWorldVerts(sprite) {
    var local = this._local;
    var world = this._renderData.vDatas[0];
    var floatsPerVert = this.floatsPerVert;

    for (var i = 0, l = local.length / 2; i < l; i++) {
      world[i * floatsPerVert] = local[i * 2];
      world[i * floatsPerVert + 1] = local[i * 2 + 1];
    }
  }
});

},{}],16:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
Object.assign(cc.Sprite.__assembler__.RadialFilled.prototype, {
  updateWorldVerts: function updateWorldVerts(sprite) {
    var local = this._local;
    var world = this._renderData.vDatas[0];
    var floatsPerVert = this.floatsPerVert;

    for (var offset = 0, l = world.length; offset < l; offset += floatsPerVert) {
      world[offset] = local[offset];
      world[offset + 1] = local[offset + 1];
    }
  }
});

},{}],17:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var proto = cc.Sprite.__assembler__.Simple.prototype;
var nativeProto = renderer.SimpleSprite2D.prototype;

proto.updateWorldVerts = function (comp) {
  this._dirtyPtr[0] |= cc.Assembler.FLAG_VERTICES_DIRTY;
};

proto._extendNative = function () {
  nativeProto.ctor.call(this);
};

proto.initLocal = function () {
  this._local = new Float32Array(4);
  nativeProto.setLocalData.call(this, this._local);
};

},{}],18:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var proto = cc.Sprite.__assembler__.Sliced.prototype;
var nativeProto = renderer.SlicedSprite2D.prototype;

proto.updateWorldVerts = function (comp) {
  this._dirtyPtr[0] |= cc.Assembler.FLAG_VERTICES_DIRTY;
};

proto._extendNative = function () {
  nativeProto.ctor.call(this);
};

proto.initLocal = function () {
  this._local = new Float32Array(8);
  nativeProto.setLocalData.call(this, this._local);
};

},{}],19:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
Object.assign(cc.Sprite.__assembler__.Tiled.prototype, {
  updateWorldVerts: function updateWorldVerts(sprite) {
    var renderData = this._renderData;
    var local = this._local;
    var localX = local.x,
        localY = local.y;
    var world = renderData.vDatas[0];
    var row = this.row,
        col = this.col;
    var x, x1, y, y1;
    var floatsPerVert = this.floatsPerVert;
    var vertexOffset = 0;

    for (var yindex = 0, ylength = row; yindex < ylength; ++yindex) {
      y = localY[yindex];
      y1 = localY[yindex + 1];

      for (var xindex = 0, xlength = col; xindex < xlength; ++xindex) {
        x = localX[xindex];
        x1 = localX[xindex + 1]; // lb

        world[vertexOffset] = x;
        world[vertexOffset + 1] = y;
        vertexOffset += floatsPerVert; // rb

        world[vertexOffset] = x1;
        world[vertexOffset + 1] = y;
        vertexOffset += floatsPerVert; // lt

        world[vertexOffset] = x;
        world[vertexOffset + 1] = y1;
        vertexOffset += floatsPerVert; // rt

        world[vertexOffset] = x1;
        world[vertexOffset + 1] = y1;
        vertexOffset += floatsPerVert;
      }
    }
  }
});

},{}],20:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.BarFilled3D) return;
  var proto = cc.Sprite.__assembler__.BarFilled3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: cc.Assembler3D.updateWorldVerts
  });
})();

},{}],21:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.Mesh3D) return;
  var proto = cc.Sprite.__assembler__.Mesh3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: function updateWorldVerts(sprite) {
      var local = this._local;
      var world = this._renderData.vDatas[0];
      var floatsPerVert = this.floatsPerVert,
          offset = 0;

      for (var i = 0, j = 0, l = local.length / 2; i < l; i++, offset += floatsPerVert) {
        j = i * 2;
        world[offset] = local[j];
        world[offset + 1] = local[j + 1];
        world[offset + 2] = 0;
      }
    }
  });
})();

},{}],22:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.RadialFilled3D) return;
  var proto = cc.Sprite.__assembler__.RadialFilled3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: function updateWorldVerts(sprite) {
      var local = this._local;
      var world = this._renderData.vDatas[0];
      var floatsPerVert = this.floatsPerVert;

      for (var offset = 0, l = world.length; offset < l; offset += floatsPerVert) {
        world[offset] = local[offset];
        world[offset + 1] = local[offset + 1];
        world[offset + 2] = 0;
      }
    }
  });
})();

},{}],23:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.Simple3D) return;
  var proto = cc.Sprite.__assembler__.Simple3D.prototype;
  var nativeProto = renderer.SimpleSprite3D.prototype;
  Object.assign(proto, {
    _extendNative: nativeProto.ctor
  });
})();

},{}],24:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.Sliced3D) return;
  var proto = cc.Sprite.__assembler__.Sliced3D.prototype;
  var nativeProto = renderer.SlicedSprite3D.prototype;
  Object.assign(proto, {
    _extendNative: nativeProto.ctor
  });
})();

},{}],25:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.Sprite.__assembler__.Tiled3D) return;
  var proto = cc.Sprite.__assembler__.Tiled3D.prototype;
  Object.assign(proto, {
    updateWorldVerts: function updateWorldVerts(sprite) {
      var local = this._local;
      var localX = local.x,
          localY = local.y;
      var world = this._renderData.vDatas[0];
      var row = this.row,
          col = this.col;
      var x, x1, y, y1;
      var vertexOffset = 0;

      for (var yindex = 0, ylength = row; yindex < ylength; ++yindex) {
        y = localY[yindex];
        y1 = localY[yindex + 1];

        for (var xindex = 0, xlength = col; xindex < xlength; ++xindex) {
          x = localX[xindex];
          x1 = localX[xindex + 1]; // left bottom

          var padding = 6;
          world[vertexOffset] = x;
          world[vertexOffset + 1] = y;
          world[vertexOffset + 2] = 0;
          vertexOffset += padding; // right bottom

          world[vertexOffset] = x1;
          world[vertexOffset + 1] = y;
          world[vertexOffset + 2] = 0;
          vertexOffset += padding; // left top

          world[vertexOffset] = x;
          world[vertexOffset + 1] = y1;
          world[vertexOffset + 2] = 0;
          vertexOffset += padding; // right top

          world[vertexOffset] = x1;
          world[vertexOffset + 1] = y1;
          world[vertexOffset + 2] = 0;
          vertexOffset += padding;
        }
      }
    }
  });
})();

},{}],26:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
require('./2d/sliced.js');

require('./2d/tiled.js');

require('./2d/radial-filled.js');

require('./2d/simple.js');

require('./2d/mesh.js');

require('./3d/sliced.js');

require('./3d/simple.js');

require('./3d/tiled.js');

require('./3d/mesh.js');

require('./3d/bar-filled.js');

require('./3d/radial-filled.js');

},{"./2d/mesh.js":15,"./2d/radial-filled.js":16,"./2d/simple.js":17,"./2d/sliced.js":18,"./2d/tiled.js":19,"./3d/bar-filled.js":20,"./3d/mesh.js":21,"./3d/radial-filled.js":22,"./3d/simple.js":23,"./3d/sliced.js":24,"./3d/tiled.js":25}],27:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
require('./jsb-sys.js');

require('./jsb-game.js');

require('./jsb-videoplayer.js');

require('./jsb-webview.js');

require('./jsb-audio.js');

require('./jsb-loader.js');

require('./jsb-editbox.js');

require('./jsb-reflection.js');

require('./jsb-assets-manager.js');

require('./jsb-safearea.js');

if (CC_NATIVERENDERER) {
  require('./jsb-effect.js');

  require('./jsb-effect-variant.js');

  require('./scene/camera.js');

  require('./scene/light.js');

  require('./scene/node-proxy.js');

  require('./scene/render-flow.js'); // must be required after render flow


  require('./scene/node.js');

  cc.game.on(cc.game.EVENT_ENGINE_INITED, function () {
    require('./scene/mesh-buffer.js');

    require('./scene/quad-buffer.js');

    require('./scene/render-data.js');

    require('./assemblers/assembler.js');

    require('./assemblers/assembler-2d.js');

    require('./assemblers/assembler-3d.js');

    require('./assemblers/sprite/index.js');

    require('./assemblers/label/index.js');

    require('./assemblers/mask-assembler.js');

    require('./assemblers/graphics-assembler.js');

    require('./assemblers/motion-streak.js');

    require('./assemblers/mesh-renderer.js');

    require('./assemblers/particle-3d-assembler.js');

    require('./jsb-dragonbones.js');

    require('./jsb-spine-skeleton.js');

    require('./jsb-particle.js');

    require('./jsb-tiledmap.js');

    require('./jsb-skin-mesh.js');
  });
}

},{"./assemblers/assembler-2d.js":2,"./assemblers/assembler-3d.js":3,"./assemblers/assembler.js":4,"./assemblers/graphics-assembler.js":5,"./assemblers/label/index.js":10,"./assemblers/mask-assembler.js":11,"./assemblers/mesh-renderer.js":12,"./assemblers/motion-streak.js":13,"./assemblers/particle-3d-assembler.js":14,"./assemblers/sprite/index.js":26,"./jsb-assets-manager.js":28,"./jsb-audio.js":29,"./jsb-dragonbones.js":31,"./jsb-editbox.js":32,"./jsb-effect-variant.js":33,"./jsb-effect.js":34,"./jsb-game.js":36,"./jsb-loader.js":37,"./jsb-particle.js":38,"./jsb-reflection.js":39,"./jsb-safearea.js":40,"./jsb-skin-mesh.js":41,"./jsb-spine-skeleton.js":42,"./jsb-sys.js":43,"./jsb-tiledmap.js":44,"./jsb-videoplayer.js":45,"./jsb-webview.js":46,"./scene/camera.js":47,"./scene/light.js":48,"./scene/mesh-buffer.js":49,"./scene/node-proxy.js":50,"./scene/node.js":51,"./scene/quad-buffer.js":52,"./scene/render-data.js":53,"./scene/render-flow.js":54}],28:[function(require,module,exports){
"use strict";

/*
 * Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
if (jsb.AssetsManager) {
  jsb.AssetsManager.State = {
    UNINITED: 0,
    UNCHECKED: 1,
    PREDOWNLOAD_VERSION: 2,
    DOWNLOADING_VERSION: 3,
    VERSION_LOADED: 4,
    PREDOWNLOAD_MANIFEST: 5,
    DOWNLOADING_MANIFEST: 6,
    MANIFEST_LOADED: 7,
    NEED_UPDATE: 8,
    READY_TO_UPDATE: 9,
    UPDATING: 10,
    UNZIPPING: 11,
    UP_TO_DATE: 12,
    FAIL_TO_UPDATE: 13
  };
  jsb.Manifest.DownloadState = {
    UNSTARTED: 0,
    DOWNLOADING: 1,
    SUCCESSED: 2,
    UNMARKED: 3
  };
  jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST = 0;
  jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST = 1;
  jsb.EventAssetsManager.ERROR_PARSE_MANIFEST = 2;
  jsb.EventAssetsManager.NEW_VERSION_FOUND = 3;
  jsb.EventAssetsManager.ALREADY_UP_TO_DATE = 4;
  jsb.EventAssetsManager.UPDATE_PROGRESSION = 5;
  jsb.EventAssetsManager.ASSET_UPDATED = 6;
  jsb.EventAssetsManager.ERROR_UPDATING = 7;
  jsb.EventAssetsManager.UPDATE_FINISHED = 8;
  jsb.EventAssetsManager.UPDATE_FAILED = 9;
  jsb.EventAssetsManager.ERROR_DECOMPRESS = 10;
}

},{}],29:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var cacheManager = require('./jsb-cache-manager');

var Audio = cc._Audio = function (src) {
  this.src = src;
  this.volume = 1;
  this.loop = false;
  this.id = -1;
};

var handleVolume = function handleVolume(volume) {
  if (volume === undefined) {
    // set default volume as 1
    volume = 1;
  } else if (typeof volume === 'string') {
    volume = Number.parseFloat(volume);
  }

  return volume;
};

(function (proto, audioEngine) {
  if (!audioEngine) return; // Using the new audioEngine

  cc.audioEngine = audioEngine;

  audioEngine.setMaxWebAudioSize = function () {};

  Audio.State = audioEngine.AudioState;

  proto.play = function () {
    audioEngine.stop(this.id);
    var clip = this.src;
    this.id = audioEngine.play(clip, this.loop, this.volume);
  };

  proto.pause = function () {
    audioEngine.pause(this.id);
  };

  proto.resume = function () {
    audioEngine.resume(this.id);
  };

  proto.stop = function () {
    audioEngine.stop(this.id);
  };

  proto.destroy = function () {};

  proto.setLoop = function (loop) {
    this.loop = loop;
    audioEngine.setLoop(this.id, loop);
  };

  proto.getLoop = function () {
    return this.loop;
  };

  proto.setVolume = function (volume) {
    volume = handleVolume(volume);
    this.volume = volume;
    return audioEngine.setVolume(this.id, volume);
  };

  proto.getVolume = function () {
    return this.volume;
  };

  proto.setCurrentTime = function (time) {
    audioEngine.setCurrentTime(this.id, time);
  };

  proto.getCurrentTime = function () {
    return audioEngine.getCurrentTime(this.id);
  };

  proto.getDuration = function () {
    return audioEngine.getDuration(this.id);
  };

  proto.getState = function () {
    return audioEngine.getState(this.id);
  }; // polyfill audioEngine


  var _music = {
    id: -1,
    clip: '',
    loop: false,
    volume: 1
  };
  var _effect = {
    volume: 1
  };

  audioEngine.play = function (clip, loop, volume) {
    if (typeof volume !== 'number') {
      volume = 1;
    }

    var audioFilePath;

    if (typeof clip === 'string') {
      // backward compatibility since 1.10
      cc.warnID(8401, 'cc.audioEngine', 'cc.AudioClip', 'AudioClip', 'cc.AudioClip', 'audio');
      audioFilePath = clip;
    } else {
      if (clip.loaded) {
        audioFilePath = clip._nativeAsset;
      } else {
        // audio delay loading
        clip._nativeAsset = audioFilePath = cacheManager.getCache(clip.nativeUrl) || clip.nativeUrl;
        clip.loaded = true;
      }
    }

    return audioEngine.play2d(audioFilePath, loop, volume);
  };

  audioEngine.playMusic = function (clip, loop) {
    audioEngine.stop(_music.id);
    _music.id = audioEngine.play(clip, loop, _music.volume);
    _music.loop = loop;
    _music.clip = clip;
    return _music.id;
  };

  audioEngine.stopMusic = function () {
    audioEngine.stop(_music.id);
  };

  audioEngine.pauseMusic = function () {
    audioEngine.pause(_music.id);
    return _music.id;
  };

  audioEngine.resumeMusic = function () {
    audioEngine.resume(_music.id);
    return _music.id;
  };

  audioEngine.getMusicVolume = function () {
    return _music.volume;
  };

  audioEngine.setMusicVolume = function (volume) {
    _music.volume = handleVolume(volume);
    audioEngine.setVolume(_music.id, _music.volume);
    return volume;
  };

  audioEngine.isMusicPlaying = function () {
    return audioEngine.getState(_music.id) === audioEngine.AudioState.PLAYING;
  };

  audioEngine.playEffect = function (filePath, loop) {
    return audioEngine.play(filePath, loop || false, _effect.volume);
  };

  audioEngine.setEffectsVolume = function (volume) {
    _effect.volume = handleVolume(volume);
  };

  audioEngine.getEffectsVolume = function () {
    return _effect.volume;
  };

  audioEngine.pauseEffect = function (audioID) {
    return audioEngine.pause(audioID);
  };

  audioEngine.pauseAllEffects = function () {
    var musicPlay = audioEngine.getState(_music.id) === audioEngine.AudioState.PLAYING;
    audioEngine.pauseAll();

    if (musicPlay) {
      audioEngine.resume(_music.id);
    }
  };

  audioEngine.resumeEffect = function (id) {
    audioEngine.resume(id);
  };

  audioEngine.resumeAllEffects = function () {
    var musicPaused = audioEngine.getState(_music.id) === audioEngine.AudioState.PAUSED;
    audioEngine.resumeAll();

    if (musicPaused && audioEngine.getState(_music.id) === audioEngine.AudioState.PLAYING) {
      audioEngine.pause(_music.id);
    }
  };

  audioEngine.stopEffect = function (id) {
    return audioEngine.stop(id);
  };

  audioEngine.stopAllEffects = function () {
    var musicPlaying = audioEngine.getState(_music.id) === audioEngine.AudioState.PLAYING;
    var currentTime = audioEngine.getCurrentTime(_music.id);
    audioEngine.stopAll();

    if (musicPlaying) {
      _music.id = audioEngine.play(_music.clip, _music.loop);
      audioEngine.setCurrentTime(_music.id, currentTime);
    }
  }; // Unnecessary on native platform


  audioEngine._break = function () {};

  audioEngine._restore = function () {}; // deprecated


  audioEngine._uncache = audioEngine.uncache;

  audioEngine.uncache = function (clip) {
    var path;

    if (typeof clip === 'string') {
      // backward compatibility since 1.10
      cc.warnID(8401, 'cc.audioEngine', 'cc.AudioClip', 'AudioClip', 'cc.AudioClip', 'audio');
      path = clip;
    } else {
      if (!clip) {
        return;
      }

      path = clip._nativeAsset;
    }

    audioEngine._uncache(path);
  };

  audioEngine._preload = audioEngine.preload;

  audioEngine.preload = function (filePath, callback) {
    cc.warn('`cc.audioEngine.preload` is deprecated, use `cc.assetManager.loadRes(url, cc.AudioClip)` instead please.');

    audioEngine._preload(filePath, callback);
  };
})(Audio.prototype, jsb.AudioEngine);

},{"./jsb-cache-manager":30}],30:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of cache-manager software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in cache-manager License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var _require = require('./jsb-fs-utils'),
    getUserDataPath = _require.getUserDataPath,
    readJsonSync = _require.readJsonSync,
    makeDirSync = _require.makeDirSync,
    writeFileSync = _require.writeFileSync,
    writeFile = _require.writeFile,
    deleteFile = _require.deleteFile,
    rmdirSync = _require.rmdirSync;

var writeCacheFileList = null;
var startWrite = false;
var nextCallbacks = [];
var callbacks = [];
var cleaning = false;
var REGEX = /^\w+:\/\/.*/;
var cacheManager = {
  cacheDir: 'gamecaches',
  cachedFileName: 'cacheList.json',
  deleteInterval: 500,
  writeFileInterval: 2000,
  cachedFiles: null,
  version: '1.1',
  getCache: function getCache(url) {
    this.updateLastTime(url);
    return this.cachedFiles.has(url) ? "".concat(this.cacheDir, "/").concat(this.cachedFiles.get(url).url) : '';
  },
  getTemp: function getTemp(url) {
    return '';
  },
  init: function init() {
    this.cacheDir = getUserDataPath() + '/' + this.cacheDir;
    var cacheFilePath = this.cacheDir + '/' + this.cachedFileName;
    var result = readJsonSync(cacheFilePath);

    if (result instanceof Error || !result.version || result.version !== this.version) {
      if (!(result instanceof Error)) rmdirSync(this.cacheDir, true);
      this.cachedFiles = new cc.AssetManager.Cache();
      makeDirSync(this.cacheDir, true);
      writeFileSync(cacheFilePath, JSON.stringify({
        files: this.cachedFiles._map,
        version: this.version
      }), 'utf8');
    } else {
      this.cachedFiles = new cc.AssetManager.Cache(result.files);
    }
  },
  updateLastTime: function updateLastTime(url) {
    if (this.cachedFiles.has(url)) {
      var cache = this.cachedFiles.get(url);
      cache.lastTime = Date.now();
    }
  },
  _write: function _write() {
    writeCacheFileList = null;
    startWrite = true;
    writeFile(this.cacheDir + '/' + this.cachedFileName, JSON.stringify({
      files: this.cachedFiles._map,
      version: this.version
    }), 'utf8', function () {
      startWrite = false;

      for (var i = 0, j = callbacks.length; i < j; i++) {
        callbacks[i]();
      }

      callbacks.length = 0;
      callbacks.push.apply(callbacks, nextCallbacks);
      nextCallbacks.length = 0;
    });
  },
  writeCacheFile: function writeCacheFile(cb) {
    if (!writeCacheFileList) {
      writeCacheFileList = setTimeout(this._write.bind(this), this.writeFileInterval);

      if (startWrite === true) {
        cb && nextCallbacks.push(cb);
      } else {
        cb && callbacks.push(cb);
      }
    } else {
      cb && callbacks.push(cb);
    }
  },
  cacheFile: function cacheFile(id, url, cacheBundleRoot) {
    this.cachedFiles.add(id, {
      bundle: cacheBundleRoot,
      url: url,
      lastTime: Date.now()
    });
    this.writeCacheFile();
  },
  clearCache: function clearCache() {
    var _this = this;

    rmdirSync(this.cacheDir, true);
    this.cachedFiles = new cc.AssetManager.Cache();
    makeDirSync(this.cacheDir, true);
    var cacheFilePath = this.cacheDir + '/' + this.cachedFileName;
    writeFileSync(cacheFilePath, JSON.stringify({
      files: this.cachedFiles._map,
      version: this.version
    }), 'utf8');
    cc.assetManager.bundles.forEach(function (bundle) {
      if (REGEX.test(bundle.base)) _this.makeBundleFolder(bundle.name);
    });
  },
  clearLRU: function clearLRU() {
    var _this2 = this;

    if (cleaning) return;
    cleaning = true;
    var caches = [];
    var self = this;
    this.cachedFiles.forEach(function (val, key) {
      if (val.bundle === 'internal') return;
      caches.push({
        originUrl: key,
        url: _this2.getCache(key),
        lastTime: val.lastTime
      });
    });
    caches.sort(function (a, b) {
      return a.lastTime - b.lastTime;
    });
    caches.length = Math.floor(caches.length / 3);
    if (caches.length === 0) return;

    for (var i = 0, l = caches.length; i < l; i++) {
      this.cachedFiles.remove(caches[i].originUrl);
    }

    this.writeCacheFile(function () {
      function deferredDelete() {
        var item = caches.pop();
        deleteFile(item.url);

        if (caches.length > 0) {
          setTimeout(deferredDelete, self.deleteInterval);
        } else {
          cleaning = false;
        }
      }

      setTimeout(deferredDelete, self.deleteInterval);
    });
  },
  removeCache: function removeCache(url) {
    if (this.cachedFiles.has(url)) {
      var path = this.getCache(url);
      this.cachedFiles.remove(url);
      this.writeCacheFile(function () {
        deleteFile(path);
      });
    }
  },
  makeBundleFolder: function makeBundleFolder(bundleName) {
    makeDirSync(this.cacheDir + '/' + bundleName, true);
  }
};
cc.assetManager.cacheManager = module.exports = cacheManager;

},{"./jsb-fs-utils":35}],31:[function(require,module,exports){
"use strict";

var _constants = require("constants");

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var cacheManager = require('./jsb-cache-manager');

(function () {
  if (window.dragonBones === undefined || window.middleware === undefined) return;
  if (dragonBones.DragonBonesAtlasAsset === undefined) return; // dragonbones global time scale.

  Object.defineProperty(dragonBones, 'timeScale', {
    get: function get() {
      return this._timeScale;
    },
    set: function set(value) {
      this._timeScale = value;
      var factory = this.CCFactory.getInstance();
      factory.setTimeScale(value);
    },
    configurable: true
  });
  jsb.generateGetSet(dragonBones);

  var _slotColor = cc.color(0, 0, 255, 255);

  var _boneColor = cc.color(255, 0, 0, 255);

  var _originColor = cc.color(0, 255, 0, 255); ////////////////////////////////////////////////////////////
  // override dragonBones library by native dragonBones
  ////////////////////////////////////////////////////////////
  //--------------------
  // adapt event name
  //--------------------


  dragonBones.EventObject.START = "start";
  dragonBones.EventObject.LOOP_COMPLETE = "loopComplete";
  dragonBones.EventObject.COMPLETE = "complete";
  dragonBones.EventObject.FADE_IN = "fadeIn";
  dragonBones.EventObject.FADE_IN_COMPLETE = "fadeInComplete";
  dragonBones.EventObject.FADE_OUT = "fadeOut";
  dragonBones.EventObject.FADE_OUT_COMPLETE = "fadeOutComplete";
  dragonBones.EventObject.FRAME_EVENT = "frameEvent";
  dragonBones.EventObject.SOUND_EVENT = "soundEvent";
  dragonBones.DragonBones = {
    ANGLE_TO_RADIAN: Math.PI / 180,
    RADIAN_TO_ANGLE: 180 / Math.PI
  }; //-------------------
  // native factory
  //-------------------

  var factoryProto = dragonBones.CCFactory.prototype;

  factoryProto.createArmatureNode = function (comp, armatureName, node) {
    node = node || new cc.Node();
    var display = node.getComponent(dragonBones.ArmatureDisplay);

    if (!display) {
      display = node.addComponent(dragonBones.ArmatureDisplay);
    }

    node.name = armatureName;
    display._armatureName = armatureName;
    display._N$dragonAsset = comp.dragonAsset;
    display._N$dragonAtlasAsset = comp.dragonAtlasAsset;

    display._init();

    return display;
  };

  var _replaceSkin = factoryProto.replaceSkin;

  factoryProto.replaceSkin = function (armatrue, skinData, isOverride, exclude) {
    if (isOverride == undefined) isOverride = false;
    exclude = exclude || [];

    _replaceSkin.call(this, armatrue, skinData, isOverride, exclude);
  };

  var _changeSkin = factoryProto.changeSkin;

  factoryProto.changeSkin = function (armatrue, skinData, exclude) {
    _changeSkin.call(this, armatrue, skinData, exclude);
  }; //-------------------
  // native animation state
  //-------------------


  var animationStateProto = dragonBones.AnimationState.prototype;
  var _isPlaying = animationStateProto.isPlaying;
  Object.defineProperty(animationStateProto, 'isPlaying', {
    get: function get() {
      return _isPlaying.call(this);
    }
  }); //-------------------
  // native armature
  //-------------------

  var armatureProto = dragonBones.Armature.prototype;

  armatureProto.addEventListener = function (eventType, listener, target) {
    if (!this.__persistentDisplay__) {
      this.__persistentDisplay__ = this.getDisplay();
    }

    this.__persistentDisplay__.on(eventType, listener, target);
  };

  armatureProto.removeEventListener = function (eventType, listener, target) {
    if (!this.__persistentDisplay__) {
      this.__persistentDisplay__ = this.getDisplay();
    }

    this.__persistentDisplay__.off(eventType, listener, target);
  }; //--------------------------
  // native CCArmatureDisplay
  //--------------------------


  var nativeArmatureDisplayProto = dragonBones.CCArmatureDisplay.prototype;
  Object.defineProperty(nativeArmatureDisplayProto, "node", {
    get: function get() {
      return this;
    }
  });

  nativeArmatureDisplayProto.getRootNode = function () {
    var rootDisplay = this.getRootDisplay();
    return rootDisplay && rootDisplay._ccNode;
  };

  nativeArmatureDisplayProto.convertToWorldSpace = function (point) {
    var newPos = this.convertToRootSpace(point);
    newPos = cc.v2(newPos.x, newPos.y);
    var ccNode = this.getRootNode();
    if (!ccNode) return newPos;
    var finalPos = ccNode.convertToWorldSpaceAR(newPos);
    return finalPos;
  };

  nativeArmatureDisplayProto.initEvent = function () {
    if (this._eventTarget) {
      return;
    }

    this._eventTarget = new cc.EventTarget();
    this.setDBEventCallback(function (eventObject) {
      this._eventTarget.emit(eventObject.type, eventObject);
    });
  };

  nativeArmatureDisplayProto.on = function (type, listener, target) {
    this.initEvent();

    this._eventTarget.on(type, listener, target);

    this.addDBEventListener(type, listener);
  };

  nativeArmatureDisplayProto.off = function (type, listener, target) {
    this.initEvent();

    this._eventTarget.off(type, listener, target);

    this.removeDBEventListener(type, listener);
  };

  nativeArmatureDisplayProto.once = function (type, listener, target) {
    this.initEvent();

    this._eventTarget.once(type, listener, target);

    this.addDBEventListener(type, listener);
  }; ////////////////////////////////////////////////////////////
  // override DragonBonesAtlasAsset
  ////////////////////////////////////////////////////////////


  var dbAtlas = dragonBones.DragonBonesAtlasAsset.prototype;
  var _gTextureIdx = 1;
  var _textureKeyMap = {};

  var _textureMap = new WeakMap();

  var _textureIdx2Name = {};

  dbAtlas.removeRecordTexture = function (texture) {
    if (!texture) return;
    delete _textureIdx2Name[texture.url];
    var index = texture.__textureIndex__;

    if (index) {
      var texKey = _textureKeyMap[index];

      if (texKey && _textureMap.has(texKey)) {
        _textureMap["delete"](texKey);

        delete _textureKeyMap[index];
      }
    }
  };

  dbAtlas.recordTexture = function () {
    if (this._texture && this._oldTexture !== this._texture) {
      this.removeRecordTexture(this._oldTexture);
      var texKey = _textureKeyMap[_gTextureIdx] = {
        key: _gTextureIdx
      };

      _textureMap.set(texKey, this._texture);

      this._oldTexture = this._texture;
      this._texture.__textureIndex__ = _gTextureIdx;
      _gTextureIdx++;
    }
  };

  dbAtlas.getTextureByIndex = function (textureIdx) {
    var texKey = _textureKeyMap[textureIdx];
    if (!texKey) return;
    return _textureMap.get(texKey);
  };

  dbAtlas.updateTextureAtlasData = function (factory) {
    var url = this._texture.url;
    var preAtlasInfo = _textureIdx2Name[url];
    var index; // If the texture has store the atlas info before,then get native atlas object,and 
    // update script texture map.

    if (preAtlasInfo) {
      index = preAtlasInfo.index;
      this._textureAtlasData = factory.getTextureAtlasDataByIndex(preAtlasInfo.name, index);
      var texKey = _textureKeyMap[preAtlasInfo.index];

      _textureMap.set(texKey, this._texture);

      this._texture.__textureIndex__ = index; // If script has store the atlas info,but native has no atlas object,then
      // still new native texture2d object,but no call recordTexture to increase
      // textureIndex.

      if (this._textureAtlasData) {
        return;
      }
    } else {
      this.recordTexture();
    }

    index = this._texture.__textureIndex__;
    this.jsbTexture = new middleware.Texture2D();
    this.jsbTexture.setRealTextureIndex(index);
    this.jsbTexture.setPixelsWide(this._texture.width);
    this.jsbTexture.setPixelsHigh(this._texture.height);
    this._textureAtlasData = factory.parseTextureAtlasData(this.atlasJson, this.jsbTexture, this._uuid);
    this.jsbTexture.setNativeTexture(this._texture.getImpl());
    _textureIdx2Name[url] = {
      name: this._textureAtlasData.name,
      index: index
    };
  };

  dbAtlas.init = function (factory) {
    this._factory = factory; // If create by manual, uuid is empty.

    if (!this._uuid) {
      var atlasJsonObj = JSON.parse(this.atlasJson);
      this._uuid = atlasJsonObj.name;
    }

    if (this._textureAtlasData) {
      factory.addTextureAtlasData(this._textureAtlasData, this._uuid);
    } else {
      this.updateTextureAtlasData(factory);
    }
  };

  dbAtlas._clear = function (dontRecordTexture) {
    if (this._factory) {
      this._factory.removeTextureAtlasData(this._uuid, true);

      this._factory.removeDragonBonesDataByUUID(this._uuid, true);
    }

    this._textureAtlasData = null;

    if (!dontRecordTexture) {
      this.recordTexture();
    }
  };

  dbAtlas.destroy = function () {
    this.removeRecordTexture(this._texture);

    this._clear(true);

    cc.Asset.prototype.destroy.call(this);
  }; ////////////////////////////////////////////////////////////
  // override DragonBonesAsset
  ////////////////////////////////////////////////////////////


  var dbAsset = dragonBones.DragonBonesAsset.prototype;

  dbAsset.init = function (factory, atlasUUID) {
    this._factory = factory; // If create by manual, uuid is empty.
    // Only support json format, if remote load dbbin, must set uuid by manual.

    if (!this._uuid && this.dragonBonesJson) {
      var rawData = JSON.parse(this.dragonBonesJson);
      this._uuid = rawData.name;
    }

    var armatureKey = this._uuid + "#" + atlasUUID;

    var dragonBonesData = this._factory.getDragonBonesData(armatureKey);

    if (dragonBonesData) return armatureKey;
    var filePath = null;

    if (this.dragonBonesJson) {
      filePath = this.dragonBonesJson;
    } else {
      filePath = cacheManager.getCache(this.nativeUrl) || this.nativeUrl;
    }

    this._factory.parseDragonBonesDataByPath(filePath, armatureKey);

    return armatureKey;
  };

  var armatureCacheMgr = dragonBones.ArmatureCacheMgr.getInstance();
  dragonBones.armatureCacheMgr = armatureCacheMgr;

  dbAsset._clear = function () {
    if (this._factory) {
      this._factory.removeDragonBonesDataByUUID(this._uuid, true);
    }

    armatureCacheMgr.removeArmatureCache(this._uuid);
  }; ////////////////////////////////////////////////////////////
  // adapt attach util
  ////////////////////////////////////////////////////////////


  var attachUtilProto = dragonBones.AttachUtil.prototype;
  var _attachUtilInit = attachUtilProto.init;

  attachUtilProto.init = function (armatureDisplay) {
    _attachUtilInit.call(this, armatureDisplay);

    this._nativeDisplay = armatureDisplay._nativeDisplay;
    this._attachUtilNative = null;
  };

  var _generateAllAttachedNodes = attachUtilProto.generateAllAttachedNodes;

  attachUtilProto.generateAllAttachedNodes = function () {
    var res = _generateAllAttachedNodes.call(this);

    this._associateAttachedNode();

    return res;
  };

  var _generateAttachedNodes = attachUtilProto.generateAttachedNodes;

  attachUtilProto.generateAttachedNodes = function (boneName) {
    var res = _generateAttachedNodes.call(this, boneName);

    this._associateAttachedNode();

    return res;
  };

  var _associateAttachedNode = attachUtilProto._associateAttachedNode;

  attachUtilProto._associateAttachedNode = function () {
    if (!this._inited) return;

    var rootNode = this._armatureNode.getChildByName('ATTACHED_NODE_TREE');

    if (!rootNode || !rootNode.isValid) return; // associate js

    _associateAttachedNode.call(this); // associate native


    if (!this._attachUtilNative) {
      if (this._armatureDisplay.isAnimationCached()) {
        this._attachUtilNative = new dragonBones.CacheModeAttachUtil();
      } else {
        this._attachUtilNative = new dragonBones.RealTimeAttachUtil();
      }

      this._nativeDisplay.setAttachUtil(this._attachUtilNative);
    }

    this._attachUtilNative.associateAttachedNode(this._armature, this._armatureNode._proxy);
  }; ////////////////////////////////////////////////////////////
  // override ArmatureDisplay
  ////////////////////////////////////////////////////////////


  dragonBones.ArmatureDisplay._assembler = null;
  var armatureDisplayProto = dragonBones.ArmatureDisplay.prototype;
  var renderCompProto = cc.RenderComponent.prototype;
  var AnimationCacheMode = dragonBones.ArmatureDisplay.AnimationCacheMode;
  Object.defineProperty(armatureDisplayProto, 'armatureName', {
    get: function get() {
      return this._armatureName;
    },
    set: function set(value) {
      this._armatureName = value;
      var animNames = this.getAnimationNames(this._armatureName);

      if (!this.animationName || animNames.indexOf(this.animationName) < 0) {
        this.animationName = '';
      }

      var oldArmature = this._armature;

      if (this._armature) {
        if (!this.isAnimationCached()) {
          this._factory.remove(this._armature);
        }

        this._armature = null;
      }

      this._nativeDisplay = null;

      this._refresh();

      if (oldArmature && oldArmature != this._armature) {
        oldArmature.dispose();
      }

      if (this._armature && !this.isAnimationCached()) {
        this._factory.add(this._armature);
      }
    },
    visible: false
  });
  Object.defineProperty(armatureDisplayProto, "premultipliedAlpha", {
    get: function get() {
      if (this._premultipliedAlpha === undefined) {
        return false;
      }

      return this._premultipliedAlpha;
    },
    set: function set(value) {
      this._premultipliedAlpha = value;

      if (this._nativeDisplay) {
        this._nativeDisplay.setOpacityModifyRGB(this._premultipliedAlpha);
      }
    }
  });
  var _initDebugDraw = armatureDisplayProto._initDebugDraw;

  armatureDisplayProto._initDebugDraw = function () {
    _initDebugDraw.call(this);

    if (this._armature && !this.isAnimationCached()) {
      this._nativeDisplay.setDebugBonesEnabled(this.debugBones);
    }
  };

  var _updateBatch = armatureDisplayProto._updateBatch;

  armatureDisplayProto._updateBatch = function () {
    _updateBatch.call(this);

    if (this._nativeDisplay) {
      this._nativeDisplay.setBatchEnabled(this.enableBatch);
    }

    this._assembler && this._assembler.clearEffect();
  };

  armatureDisplayProto._clearRenderData = function () {
    this._nativeDisplay = null;
  };

  armatureDisplayProto._resetAssembler = function () {
    this._assembler = new renderer.CustomAssembler();

    this.node._proxy.setAssembler(this._assembler);
  };

  var _updateMaterial = armatureDisplayProto._updateMaterial;
  var _materialHash2IDMap = {};
  var _materialId = 1;

  armatureDisplayProto._updateMaterial = function () {
    _updateMaterial.call(this);

    this._assembler && this._assembler.clearEffect();
    var baseMaterial = this.getMaterial(0);

    if (this._nativeDisplay && baseMaterial) {
      var originHash = baseMaterial.effect.getHash();
      var id = _materialHash2IDMap[originHash] || _materialId++;
      _materialHash2IDMap[originHash] = id;
      baseMaterial.effect.updateHash(id);
      var nativeEffect = baseMaterial.effect._nativeObj;

      this._nativeDisplay.setEffect(nativeEffect);
    }
  };

  armatureDisplayProto._buildArmature = function () {
    if (!this.dragonAsset || !this.dragonAtlasAsset || !this.armatureName) {
      this._clearRenderData();

      return;
    }

    if (this._nativeDisplay) {
      this._nativeDisplay.dispose();

      this._nativeDisplay._comp = null;
      this._nativeDisplay = null;
    }

    var atlasUUID = this.dragonAtlasAsset._uuid;
    this._armatureKey = this.dragonAsset.init(this._factory, atlasUUID);

    if (this.isAnimationCached()) {
      this._nativeDisplay = new dragonBones.CCArmatureCacheDisplay(this.armatureName, this._armatureKey, atlasUUID, this._cacheMode == AnimationCacheMode.SHARED_CACHE);
      this._armature = this._nativeDisplay.armature();
    } else {
      this._nativeDisplay = this._factory.buildArmatureDisplay(this.armatureName, this._armatureKey, "", atlasUUID);

      if (!this._nativeDisplay) {
        this._clearRenderData();

        return;
      }

      this._nativeDisplay.setDebugBonesEnabled(this.debugBones);

      this._armature = this._nativeDisplay.armature();
      this._armature.animation.timeScale = this.timeScale;

      this._factory.add(this._armature);
    } // add all event into native display


    var callbackTable = this._eventTarget._callbackTable; // just use to adapt to native api

    var emptyHandle = function emptyHandle() {};

    for (var key in callbackTable) {
      var list = callbackTable[key];
      if (!list || !list.callbackInfos || !list.callbackInfos.length) continue;

      if (this.isAnimationCached()) {
        this._nativeDisplay.addDBEventListener(key);
      } else {
        this._nativeDisplay.addDBEventListener(key, emptyHandle);
      }
    }

    this._preCacheMode = this._cacheMode;
    this._nativeDisplay._ccNode = this.node;
    this._nativeDisplay._comp = this;
    this._nativeDisplay._eventTarget = this._eventTarget;

    this._nativeDisplay.bindNodeProxy(this.node._proxy);

    this._nativeDisplay.setOpacityModifyRGB(this.premultipliedAlpha);

    this._nativeDisplay.setBatchEnabled(this.enableBatch);

    this._nativeDisplay.setColor(this.node.color);

    this._nativeDisplay.setDBEventCallback(function (eventObject) {
      this._eventTarget.emit(eventObject.type, eventObject);
    });

    this.attachUtil.init(this);

    this.attachUtil._associateAttachedNode();

    if (this.animationName) {
      this.playAnimation(this.animationName, this.playTimes);
    }

    this._updateMaterial();

    this.markForRender(true);
  };

  armatureDisplayProto._updateColor = function () {
    if (this._nativeDisplay) {
      this._nativeDisplay.setColor(this.node.color);
    }
  };

  armatureDisplayProto.playAnimation = function (animName, playTimes) {
    this.playTimes = playTimes === undefined ? -1 : playTimes;
    this.animationName = animName;

    if (this._nativeDisplay) {
      if (this.isAnimationCached()) {
        return this._nativeDisplay.playAnimation(animName, this.playTimes);
      } else {
        if (this._armature) {
          return this._armature.animation.play(animName, this.playTimes);
        }
      }
    }

    return null;
  };

  armatureDisplayProto.updateAnimationCache = function (animName) {
    if (!this.isAnimationCached()) return;

    if (this._nativeDisplay) {
      if (animName) {
        this._nativeDisplay.updateAnimationCache(animName);
      } else {
        this._nativeDisplay.updateAllAnimationCache();
      }
    }
  };

  armatureDisplayProto.invalidAnimationCache = function () {
    if (!this.isAnimationCached()) return;

    if (this._nativeDisplay) {
      this._nativeDisplay.updateAllAnimationCache();
    }
  };

  armatureDisplayProto.onEnable = function () {
    renderCompProto.onEnable.call(this);

    if (this._armature && !this.isAnimationCached()) {
      this._factory.add(this._armature);
    }
  };

  armatureDisplayProto.onDisable = function () {
    renderCompProto.onDisable.call(this);

    if (this._armature && !this.isAnimationCached()) {
      this._factory.remove(this._armature);
    }
  };

  var _onLoad = armatureDisplayProto.onLoad;

  armatureDisplayProto.onLoad = function () {
    if (_onLoad) {
      _onLoad.call(this);
    }
  };

  armatureDisplayProto.once = function (eventType, listener, target) {
    if (this._nativeDisplay) {
      if (this.isAnimationCached()) {
        this._nativeDisplay.addDBEventListener(eventType);
      } else {
        this._nativeDisplay.addDBEventListener(eventType, listener);
      }
    }

    this._eventTarget.once(eventType, listener, target);
  };

  armatureDisplayProto.addEventListener = function (eventType, listener, target) {
    if (this._nativeDisplay) {
      if (this.isAnimationCached()) {
        this._nativeDisplay.addDBEventListener(eventType);
      } else {
        this._nativeDisplay.addDBEventListener(eventType, listener);
      }
    }

    this._eventTarget.on(eventType, listener, target);
  };

  armatureDisplayProto.removeEventListener = function (eventType, listener, target) {
    if (this._nativeDisplay) {
      if (this.isAnimationCached()) {
        this._nativeDisplay.removeDBEventListener(eventType);
      } else {
        this._nativeDisplay.removeDBEventListener(eventType, listener);
      }
    }

    this._eventTarget.off(eventType, listener, target);
  };

  var _onDestroy = armatureDisplayProto.onDestroy;

  armatureDisplayProto.onDestroy = function () {
    _onDestroy.call(this);

    if (this._nativeDisplay) {
      this._nativeDisplay.dispose();

      this._nativeDisplay._comp = null;
      this._nativeDisplay = null;
    }

    this._materialCache = null;
  };

  armatureDisplayProto.update = function () {
    var nativeDisplay = this._nativeDisplay;
    if (!nativeDisplay) return;
    var node = this.node;
    if (!node) return;

    if (!this.isAnimationCached() && this._debugDraw && this.debugBones) {
      var _nativeDisplay = this._nativeDisplay;
      this._debugData = this._debugData || _nativeDisplay.getDebugData();
      if (!this._debugData) return;
      var graphics = this._debugDraw;
      graphics.clear();
      var debugData = this._debugData;
      var debugIdx = 0;
      graphics.lineWidth = 5;
      graphics.strokeColor = _boneColor;
      graphics.fillColor = _slotColor; // Root bone color is same as slot color.

      var debugBonesLen = debugData[debugIdx++];

      for (var i = 0; i < debugBonesLen; i += 4) {
        var bx = debugData[debugIdx++];
        var by = debugData[debugIdx++];
        var x = debugData[debugIdx++];
        var y = debugData[debugIdx++]; // Bone lengths.

        graphics.moveTo(bx, by);
        graphics.lineTo(x, y);
        graphics.stroke(); // Bone origins.

        graphics.circle(bx, by, Math.PI * 2);
        graphics.fill();

        if (i === 0) {
          graphics.fillColor = _originColor;
        }
      }
    }
  };
})();

},{"./jsb-cache-manager":30,"constants":1}],32:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!(cc && cc.EditBox)) {
    return;
  }

  var EditBox = cc.EditBox;
  var js = cc.js;
  var KeyboardReturnType = EditBox.KeyboardReturnType;
  var InputMode = EditBox.InputMode;
  var InputFlag = EditBox.InputFlag;
  var MAX_VALUE = 65535;
  var worldMat = new cc.Mat4(),
      cameraMat = new cc.Mat4();

  function getInputType(type) {
    switch (type) {
      case InputMode.EMAIL_ADDR:
        return 'email';

      case InputMode.NUMERIC:
      case InputMode.DECIMAL:
        return 'number';

      case InputMode.PHONE_NUMBER:
        return 'phone';

      case InputMode.URL:
        return 'url';

      case InputMode.SINGLE_LINE:
      case InputMode.ANY:
      default:
        return 'text';
    }
  }

  function getKeyboardReturnType(type) {
    switch (type) {
      case KeyboardReturnType.DEFAULT:
      case KeyboardReturnType.DONE:
        return 'done';

      case KeyboardReturnType.SEND:
        return 'send';

      case KeyboardReturnType.SEARCH:
        return 'search';

      case KeyboardReturnType.GO:
        return 'go';

      case KeyboardReturnType.NEXT:
        return 'next';
    }

    return 'done';
  }

  var BaseClass = EditBox._ImplClass;

  function JsbEditBoxImpl() {
    BaseClass.call(this);
  }

  js.extend(JsbEditBoxImpl, BaseClass);
  EditBox._ImplClass = JsbEditBoxImpl;
  Object.assign(JsbEditBoxImpl.prototype, {
    init: function init(delegate) {
      if (!delegate) {
        cc.error('EditBox init failed');
        return;
      }

      this._delegate = delegate;
    },
    _onResize: function _onResize() {
      var _this$_getRect = this._getRect(),
          x = _this$_getRect.x,
          y = _this$_getRect.y,
          width = _this$_getRect.width,
          height = _this$_getRect.height;

      jsb.inputBox.updateRect(x, y, width, height);
    },
    beginEditing: function beginEditing() {
      var self = this;
      var delegate = this._delegate;
      var multiline = delegate.inputMode === InputMode.ANY;

      var rect = this._getRect();

      var maxLength = delegate.maxLength < 0 ? MAX_VALUE : delegate.maxLength;
      var inputTypeString = getInputType(delegate.inputMode);

      if (delegate.inputFlag === InputFlag.PASSWORD) {
        inputTypeString = 'password';
      }

      function onConfirm(res) {
        delegate.editBoxEditingReturn();
      }

      function onInput(res) {
        if (delegate._string !== res.value) {
          delegate.editBoxTextChanged(res.value);
        }
      }

      function onComplete(res) {
        self.endEditing();
      }

      jsb.inputBox.onInput(onInput);
      jsb.inputBox.onConfirm(onConfirm);
      jsb.inputBox.onComplete(onComplete);

      if (!cc.sys.isMobile) {
        this._delegate._hideLabels();
      }

      jsb.inputBox.show({
        defaultValue: delegate._string,
        maxLength: maxLength,
        multiple: multiline,
        confirmHold: false,
        confirmType: getKeyboardReturnType(delegate.returnType),
        inputType: inputTypeString,
        originX: rect.x,
        originY: rect.y,
        width: rect.width,
        height: rect.height
      });
      this._editing = true;
      delegate.editBoxEditingDidBegan();

      if (!cc.sys.isMobile) {
        cc.view.on('canvas-resize', this._onResize, this);
      }
    },
    endEditing: function endEditing() {
      jsb.inputBox.offConfirm();
      jsb.inputBox.offInput();
      jsb.inputBox.offComplete();
      this._editing = false;

      if (!cc.sys.isMobile) {
        this._delegate._showLabels();
      }

      jsb.inputBox.hide();

      this._delegate.editBoxEditingDidEnded();

      if (!cc.sys.isMobile) {
        cc.view.off('canvas-resize', this._onResize, this);
      }
    },
    _getRect: function _getRect() {
      var node = this._delegate.node,
          viewScaleX = cc.view._scaleX,
          viewScaleY = cc.view._scaleY;
      var dpr = cc.view._devicePixelRatio;
      node.getWorldMatrix(worldMat);
      var camera = cc.Camera.findCamera(node);

      if (!camera) {
        return new cc.Rect();
      }

      camera.getWorldToScreenMatrix2D(cameraMat);
      cc.Mat4.multiply(cameraMat, cameraMat, worldMat);
      var contentSize = node._contentSize;
      var vec3 = cc.v3();
      vec3.x = -node._anchorPoint.x * contentSize.width;
      vec3.y = -node._anchorPoint.y * contentSize.height;
      cc.Mat4.translate(cameraMat, cameraMat, vec3);
      viewScaleX /= dpr;
      viewScaleY /= dpr;
      var finalScaleX = cameraMat.m[0] * viewScaleX;
      var finaleScaleY = cameraMat.m[5] * viewScaleY;
      var viewportRect = cc.view._viewportRect;
      var offsetX = viewportRect.x / dpr,
          offsetY = viewportRect.y / dpr;
      return {
        x: cameraMat.m[12] * viewScaleX + offsetX,
        y: cameraMat.m[13] * viewScaleY + offsetY,
        width: contentSize.width * finalScaleX,
        height: contentSize.height * finaleScaleY
      };
    }
  });
})();

},{}],33:[function(require,module,exports){
"use strict";

// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
(function () {
  if (!cc.EffectVariant) return;
  var EffectVariant = cc.EffectVariant;
  var _init = EffectVariant.prototype.init;
  Object.assign(EffectVariant.prototype, {
    init: function init(effect) {
      _init.call(this, effect);

      this._nativeObj = new renderer.EffectVariant(effect._nativeObj);
    },
    _onEffectChanged: function _onEffectChanged() {
      var nativeEffect = this._effect ? this._effect._nativeObj : null;

      this._nativeObj.setEffect(nativeEffect);
    },
    updateHash: function updateHash(hash) {
      this._nativeObj.updateHash(hash);
    }
  });
})();

},{}],34:[function(require,module,exports){
"use strict";

// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
var gfx = window.gfx; // Effect

var Effect = cc.Effect;
var _init = Effect.prototype.init;
var _clone = Effect.prototype.clone;
var _switchTechnique = Effect.prototype.switchTechnique;
Object.assign(Effect.prototype, {
  init: function init(name, techniques, techniqueIndex, asset, createNative) {
    _init.call(this, name, techniques, techniqueIndex, asset);

    if (createNative) {
      this._nativeObj = new renderer.EffectNative();

      this._nativeObj.init(techniques);

      this._nativePtr = this._nativeObj.self();
    }
  },
  clone: function clone() {
    var effect = _clone.call(this);

    effect._nativeObj = new renderer.EffectNative();

    effect._nativeObj.copy(this._nativeObj);

    effect._nativePtr = effect._nativeObj.self();
    return effect;
  },
  switchTechnique: function switchTechnique(techniqueIndex) {
    _switchTechnique.call(this, techniqueIndex);

    this._nativeObj.switchTechnique(techniqueIndex);
  }
}); // EffectBase

var EffectBase = cc.EffectBase;
var _setCullMode = EffectBase.prototype.setCullMode;
var _setBlend = EffectBase.prototype.setBlend;
var _setStencilEnabled = EffectBase.prototype.setStencilEnabled;
var _setStencil = EffectBase.prototype.setStencil;
var _setDepth = EffectBase.prototype.setDepth;
var _define = EffectBase.prototype.define;
var _setProperty = EffectBase.prototype.setProperty;
Object.assign(EffectBase.prototype, {
  setCullMode: function setCullMode() {
    var cullMode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : gfx.CULL_BACK;
    var passIdx = arguments.length > 1 ? arguments[1] : undefined;

    _setCullMode.call(this, cullMode, passIdx);

    this._nativeObj.setCullMode(cullMode, passIdx === undefined ? -1 : passIdx);
  },
  setBlend: function setBlend() {
    var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var blendEq = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : gfx.BLEND_FUNC_ADD;
    var blendSrc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : gfx.BLEND_SRC_ALPHA;
    var blendDst = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : gfx.BLEND_ONE_MINUS_SRC_ALPHA;
    var blendAlphaEq = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : gfx.BLEND_FUNC_ADD;
    var blendSrcAlpha = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : gfx.BLEND_SRC_ALPHA;
    var blendDstAlpha = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : gfx.BLEND_ONE_MINUS_SRC_ALPHA;
    var blendColor = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 0xffffffff;
    var passIdx = arguments.length > 8 ? arguments[8] : undefined;

    _setBlend.call(this, enabled, blendEq, blendSrc, blendDst, blendAlphaEq, blendSrcAlpha, blendDstAlpha, blendColor, passIdx);

    this._nativeObj.setBlend(enabled, blendEq, blendSrc, blendDst, blendAlphaEq, blendSrcAlpha, blendDstAlpha, blendColor, passIdx === undefined ? -1 : passIdx);
  },
  setDepth: function setDepth(depthTest, depthWrite, depthFunc, passIdx) {
    _setDepth.call(this, depthTest, depthWrite, depthFunc, passIdx);

    this._nativeObj.setDepth(depthTest, depthWrite, depthFunc, passIdx === undefined ? -1 : passIdx);
  },
  setStencilEnabled: function setStencilEnabled(enabled, passIdx) {
    _setStencilEnabled.call(this, enabled, passIdx);

    this._nativeObj.setStencilTest(enabled, passIdx === undefined ? -1 : passIdx);
  },
  setStencil: function setStencil() {
    var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : gfx.STENCIL_INHERIT;
    var stencilFunc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : gfx.DS_FUNC_ALWAYS;
    var stencilRef = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var stencilMask = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0xff;
    var stencilFailOp = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : gfx.STENCIL_OP_KEEP;
    var stencilZFailOp = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : gfx.STENCIL_OP_KEEP;
    var stencilZPassOp = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : gfx.STENCIL_OP_KEEP;
    var stencilWriteMask = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 0xff;
    var passIdx = arguments.length > 8 ? arguments[8] : undefined;

    _setStencil.call(this, enabled, stencilFunc, stencilRef, stencilMask, stencilFailOp, stencilZFailOp, stencilZPassOp, stencilWriteMask, passIdx);

    this._nativeObj.setStencil(stencilFunc, stencilRef, stencilMask, stencilFailOp, stencilZFailOp, stencilZPassOp, stencilWriteMask, passIdx === undefined ? -1 : passIdx);
  },
  define: function define(name, value, passIdx, force) {
    _define.call(this, name, value, passIdx, force);

    this._nativeObj.define(name, value, passIdx === undefined ? -1 : passIdx);
  },
  updateHash: function updateHash(hash) {
    this._nativeObj.updateHash(hash);
  },
  setProperty: function setProperty(name, val, passIdx, directly) {
    _setProperty.call(this, name, val, passIdx);

    var prop = this.getProperty(name);

    if (prop !== undefined) {
      this._nativeObj.setProperty(name, prop, passIdx === undefined ? -1 : passIdx, directly);
    }
  }
});

},{}],35:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of fsUtils software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in fsUtils License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var fs = jsb.fileUtils;
var jsb_downloader = null;
var downloading = new cc.AssetManager.Cache();
var tempDir = '';
var fsUtils = {
  fs: fs,
  initJsbDownloader: function initJsbDownloader(jsbDownloaderMaxTasks, jsbDownloaderTimeout) {
    jsb_downloader = new jsb.Downloader({
      countOfMaxProcessingTasks: jsbDownloaderMaxTasks || 32,
      timeoutInSeconds: jsbDownloaderTimeout || 30,
      tempFileNameSuffix: '.tmp'
    });
    tempDir = fsUtils.getUserDataPath() + '/temp';
    !fs.isDirectoryExist(tempDir) && fs.createDirectory(tempDir);
    jsb_downloader.setOnFileTaskSuccess(function (task) {
      if (!downloading.has(task.requestURL)) return;

      var _downloading$remove = downloading.remove(task.requestURL),
          onComplete = _downloading$remove.onComplete;

      onComplete && onComplete(null, task.storagePath);
    });
    jsb_downloader.setOnTaskError(function (task, errorCode, errorCodeInternal, errorStr) {
      if (!downloading.has(task.requestURL)) return;

      var _downloading$remove2 = downloading.remove(task.requestURL),
          onComplete = _downloading$remove2.onComplete;

      cc.error("Download file failed: path: ".concat(task.requestURL, " message: ").concat(errorStr, ", ").concat(errorCode));
      onComplete(new Error(errorStr), null);
    });
    jsb_downloader.setOnTaskProgress(function (task, bytesReceived, totalBytesReceived, totalBytesExpected) {
      if (!downloading.has(task.requestURL)) return;

      var _downloading$get = downloading.get(task.requestURL),
          onProgress = _downloading$get.onProgress;

      onProgress && onProgress(totalBytesReceived, totalBytesExpected);
    });
  },
  getUserDataPath: function getUserDataPath() {
    return fs.getWritablePath().replace(/[\/\\]*$/, '');
  },
  checkFsValid: function checkFsValid() {
    if (!fs) {
      cc.warn('can not get the file system!');
      return false;
    }

    return true;
  },
  deleteFile: function deleteFile(filePath, onComplete) {
    var result = fs.removeFile(filePath);

    if (result === true) {
      onComplete && onComplete(null);
    } else {
      cc.warn("Delete file failed: path: ".concat(filePath));
      onComplete && onComplete(new Error('delete file failed'));
    }
  },
  downloadFile: function downloadFile(remoteUrl, filePath, header, onProgress, onComplete) {
    downloading.add(remoteUrl, {
      onProgress: onProgress,
      onComplete: onComplete
    });
    var storagePath = filePath;
    if (!storagePath) storagePath = tempDir + '/' + performance.now() + cc.path.extname(remoteUrl);
    jsb_downloader.createDownloadFileTask(remoteUrl, storagePath, header);
  },
  saveFile: function saveFile(srcPath, destPath, onComplete) {
    var err = null;
    var result = fs.writeDataToFile(fs.getDataFromFile(srcPath), destPath);
    fs.removeFile(srcPath);

    if (!result) {
      err = new Error("Save file failed: path: ".concat(srcPath));
      cc.warn(err.message);
    }

    onComplete && onComplete(err);
  },
  copyFile: function copyFile(srcPath, destPath, onComplete) {
    var err = null;
    var result = fs.writeDataToFile(fs.getDataFromFile(srcPath), destPath);

    if (!result) {
      err = new Error("Copy file failed: path: ".concat(srcPath));
      cc.warn(err.message);
    }

    onComplete && onComplete(err);
  },
  writeFile: function writeFile(path, data, encoding, onComplete) {
    var result = null;
    var err = null;

    if (encoding === 'utf-8' || encoding === 'utf8') {
      result = fs.writeStringToFile(data, path);
    } else {
      result = fs.writeDataToFile(data, path);
    }

    if (!result) {
      err = new Error("Write file failed: path: ".concat(path));
      cc.warn(err.message);
    }

    onComplete && onComplete(err);
  },
  writeFileSync: function writeFileSync(path, data, encoding) {
    var result = null;

    if (encoding === 'utf-8' || encoding === 'utf8') {
      result = fs.writeStringToFile(data, path);
    } else {
      result = fs.writeDataToFile(data, path);
    }

    if (!result) {
      cc.warn("Write file failed: path: ".concat(path));
      return new Error("Write file failed: path: ".concat(path));
    }
  },
  readFile: function readFile(filePath, encoding, onComplete) {
    var content = null,
        err = null;

    if (encoding === 'utf-8' || encoding === 'utf8') {
      content = fs.getStringFromFile(filePath);
    } else {
      content = fs.getDataFromFile(filePath);
    }

    if (!content) {
      err = new Error("Read file failed: path: ".concat(filePath));
      cc.warn(err.message);
    }

    onComplete && onComplete(err, content);
  },
  readDir: function readDir(filePath, onComplete) {
    var files = null,
        err = null;

    try {
      files = fs.listFiles(filePath);
    } catch (e) {
      cc.warn("Read dir failed: path: ".concat(filePath, " message: ").concat(e.message));
      err = new Error(e.message);
    }

    onComplete && onComplete(err, files);
  },
  readText: function readText(filePath, onComplete) {
    fsUtils.readFile(filePath, 'utf8', onComplete);
  },
  readArrayBuffer: function readArrayBuffer(filePath, onComplete) {
    fsUtils.readFile(filePath, '', onComplete);
  },
  readJson: function readJson(filePath, onComplete) {
    fsUtils.readFile(filePath, 'utf8', function (err, text) {
      var out = null;

      if (!err) {
        try {
          out = JSON.parse(text);
        } catch (e) {
          cc.warn("Read json failed: path: ".concat(filePath, " message: ").concat(e.message));
          err = new Error(e.message);
        }
      }

      onComplete && onComplete(err, out);
    });
  },
  readJsonSync: function readJsonSync(path) {
    try {
      var str = fs.getStringFromFile(path);
      return JSON.parse(str);
    } catch (e) {
      cc.warn("Read json failed: path: ".concat(path, " message: ").concat(e.message));
      return new Error(e.message);
    }
  },
  makeDirSync: function makeDirSync(path, recursive) {
    var result = fs.createDirectory(path);

    if (!result) {
      cc.warn("Make directory failed: path: ".concat(path));
      return new Error("Make directory failed: path: ".concat(path));
    }
  },
  rmdirSync: function rmdirSync(dirPath, recursive) {
    var result = fs.removeDirectory(dirPath);

    if (!result) {
      cc.warn("rm directory failed: path: ".concat(dirPath));
      return new Error("rm directory failed: path: ".concat(dirPath));
    }
  },
  exists: function exists(filePath, onComplete) {
    var result = fs.isFileExist(filePath);
    onComplete && onComplete(result);
  },
  loadSubpackage: function loadSubpackage(name, onProgress, onComplete) {
    throw new Error('not implement');
  }
};
window.fsUtils = module.exports = fsUtils;

},{}],36:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
cc.game.restart = function () {
  // Need to clear scene, or native object destructor won't be invoke.
  cc.director.getScene().destroy();

  cc.Object._deferredDestroy();

  cc.game.pause();

  __restartVM();
};

jsb.onError(function (location, message, stack) {
  console.error(location, message, stack);
});

jsb.onPause = function () {
  cc.game.emit(cc.game.EVENT_HIDE);
};

jsb.onResume = function () {
  cc.game.emit(cc.game.EVENT_SHOW);
};

jsb.onResize = function (size) {
  if (size.width === 0 || size.height === 0) return;
  size.width /= window.devicePixelRatio;
  size.height /= window.devicePixelRatio;
  window.resize(size.width, size.height);
};

},{}],37:[function(require,module,exports){
/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var cacheManager = require('./jsb-cache-manager');

var _require = require('./jsb-fs-utils'),
    downloadFile = _require.downloadFile,
    readText = _require.readText,
    readArrayBuffer = _require.readArrayBuffer,
    readJson = _require.readJson,
    getUserDataPath = _require.getUserDataPath,
    initJsbDownloader = _require.initJsbDownloader;

var REGEX = /^\w+:\/\/.*/;
var downloader = cc.assetManager.downloader;
var parser = cc.assetManager.parser;
var presets = cc.assetManager.presets;
downloader.maxConcurrency = 30;
downloader.maxRequestsPerFrame = 60;
presets['preload'].maxConcurrency = 15;
presets['preload'].maxRequestsPerFrame = 30;
presets['scene'].maxConcurrency = 32;
presets['scene'].maxRequestsPerFrame = 64;
presets['bundle'].maxConcurrency = 32;
presets['bundle'].maxRequestsPerFrame = 64;
var suffix = 0;
var REMOTE_SERVER_ROOT = '';
var remoteBundles = {};
var failureMap = {};
var maxRetryCountFromBreakpoint = 5;
var loadedScripts = {};

function downloadScript(url, options, onComplete) {
  if (typeof options === 'function') {
    onComplete = options;
    options = null;
  }

  if (loadedScripts[url]) return onComplete && onComplete();
  download(url, function (src, options, onComplete) {
    window.require(src);

    loadedScripts[url] = true;
    onComplete && onComplete(null);
  }, options, options.onFileProgress, onComplete);
}

function download(url, func, options, onFileProgress, onComplete) {
  var result = transformUrl(url, options);

  if (result.inLocal) {
    func(result.url, options, onComplete);
  } else if (result.inCache) {
    cacheManager.updateLastTime(url);
    func(result.url, options, function (err, data) {
      if (err) {
        cacheManager.removeCache(url);
      }

      onComplete(err, data);
    });
  } else {
    var time = Date.now();
    var storagePath = '';
    var failureRecord = failureMap[url];

    if (failureRecord) {
      storagePath = failureRecord.storagePath;
    } else if (options.__cacheBundleRoot__) {
      storagePath = "".concat(options.__cacheBundleRoot__, "/").concat(time).concat(suffix++).concat(cc.path.extname(url));
    } else {
      storagePath = "".concat(time).concat(suffix++).concat(cc.path.extname(url));
    }

    downloadFile(url, "".concat(cacheManager.cacheDir, "/").concat(storagePath), options.header, onFileProgress, function (err, path) {
      if (err) {
        if (failureRecord) {
          failureRecord.retryCount++;

          if (failureRecord.retryCount >= maxRetryCountFromBreakpoint) {
            delete failureMap[url];
          }
        } else {
          failureMap[url] = {
            retryCount: 0,
            storagePath: storagePath
          };
        }

        onComplete(err, null);
        return;
      }

      delete failureMap[url];
      func(path, options, function (err, data) {
        if (!err) {
          cacheManager.cacheFile(url, storagePath, options.__cacheBundleRoot__);
        }

        onComplete(err, data);
      });
    });
  }
}

function transformUrl(url, options) {
  var inLocal = false;
  var inCache = false;

  if (REGEX.test(url)) {
    if (options.reload) {
      return {
        url: url
      };
    } else {
      var cache = cacheManager.getCache(url);

      if (cache) {
        inCache = true;
        url = cache;
      }
    }
  } else {
    inLocal = true;
  }

  return {
    url: url,
    inLocal: inLocal,
    inCache: inCache
  };
}

function doNothing(content, options, onComplete) {
  onComplete(null, content);
}

function downloadAsset(url, options, onComplete) {
  download(url, doNothing, options, options.onFileProgress, onComplete);
}

function _getFontFamily(fontHandle) {
  var ttfIndex = fontHandle.lastIndexOf(".ttf");
  if (ttfIndex === -1) return fontHandle;
  var slashPos = fontHandle.lastIndexOf("/");
  var fontFamilyName;

  if (slashPos === -1) {
    fontFamilyName = fontHandle.substring(0, ttfIndex) + "_LABEL";
  } else {
    fontFamilyName = fontHandle.substring(slashPos + 1, ttfIndex) + "_LABEL";
  }

  if (fontFamilyName.indexOf(' ') !== -1) {
    fontFamilyName = '"' + fontFamilyName + '"';
  }

  return fontFamilyName;
}

function parseText(url, options, onComplete) {
  readText(url, onComplete);
}

function parseJson(url, options, onComplete) {
  readJson(url, onComplete);
}

function downloadText(url, options, onComplete) {
  download(url, parseText, options, options.onFileProgress, onComplete);
}

function parseArrayBuffer(url, options, onComplete) {
  readArrayBuffer(url, onComplete);
}

function downloadJson(url, options, onComplete) {
  download(url, parseJson, options, options.onFileProgress, onComplete);
}

function downloadBundle(nameOrUrl, options, onComplete) {
  var bundleName = cc.path.basename(nameOrUrl);
  var version = options.version || cc.assetManager.downloader.bundleVers[bundleName];
  var url;

  if (REGEX.test(nameOrUrl) || nameOrUrl.startsWith(getUserDataPath())) {
    url = nameOrUrl;
    cacheManager.makeBundleFolder(bundleName);
  } else {
    if (remoteBundles[bundleName]) {
      url = "".concat(REMOTE_SERVER_ROOT, "remote/").concat(bundleName);
      cacheManager.makeBundleFolder(bundleName);
    } else {
      url = "assets/".concat(bundleName);
    }
  }

  var config = "".concat(url, "/config.").concat(version ? version + '.' : '', "json");
  options.__cacheBundleRoot__ = bundleName;
  downloadJson(config, options, function (err, response) {
    if (err) {
      return onComplete(err, null);
    }

    var out = response;
    out && (out.base = url + '/');
    var js = "".concat(url, "/index.").concat(version ? version + '.' : '').concat(out.encrypted ? 'jsc' : "js");
    downloadScript(js, options, function (err) {
      if (err) {
        return onComplete(err, null);
      }

      onComplete(err, out);
    });
  });
}

;

function loadFont(url, options, onComplete) {
  var fontFamilyName = _getFontFamily(url);

  var fontFace = new FontFace(fontFamilyName, "url('" + url + "')");
  document.fonts.add(fontFace);
  fontFace.load();
  fontFace.loaded.then(function () {
    onComplete(null, fontFamilyName);
  }, function () {
    cc.warnID(4933, fontFamilyName);
    onComplete(null, fontFamilyName);
  });
}

function parsePlist(url, options, onComplete) {
  readText(url, function (err, file) {
    var result = null;

    if (!err) {
      result = cc.plistParser.parse(file);
      if (!result) err = new Error('parse failed');
    }

    onComplete && onComplete(err, result);
  });
}

parser.parsePVRTex = downloader.downloadDomImage;
parser.parsePKMTex = downloader.downloadDomImage;
downloader.downloadScript = downloadScript;
downloader.register({
  // JS
  '.js': downloadScript,
  '.jsc': downloadScript,
  // Images
  '.png': downloadAsset,
  '.jpg': downloadAsset,
  '.bmp': downloadAsset,
  '.jpeg': downloadAsset,
  '.gif': downloadAsset,
  '.ico': downloadAsset,
  '.tiff': downloadAsset,
  '.webp': downloadAsset,
  '.image': downloadAsset,
  '.pvr': downloadAsset,
  '.pkm': downloadAsset,
  // Audio
  '.mp3': downloadAsset,
  '.ogg': downloadAsset,
  '.wav': downloadAsset,
  '.m4a': downloadAsset,
  // Video
  '.mp4': downloadAsset,
  '.avi': downloadAsset,
  '.mov': downloadAsset,
  '.mpg': downloadAsset,
  '.mpeg': downloadAsset,
  '.rm': downloadAsset,
  '.rmvb': downloadAsset,
  // Text
  '.txt': downloadAsset,
  '.xml': downloadAsset,
  '.vsh': downloadAsset,
  '.fsh': downloadAsset,
  '.atlas': downloadAsset,
  '.tmx': downloadAsset,
  '.tsx': downloadAsset,
  '.fnt': downloadAsset,
  '.plist': downloadAsset,
  '.json': downloadJson,
  '.ExportJson': downloadAsset,
  '.binary': downloadAsset,
  '.bin': downloadAsset,
  '.dbbin': downloadAsset,
  '.skel': downloadAsset,
  // Font
  '.font': downloadAsset,
  '.eot': downloadAsset,
  '.ttf': downloadAsset,
  '.woff': downloadAsset,
  '.svg': downloadAsset,
  '.ttc': downloadAsset,
  'bundle': downloadBundle,
  'default': downloadText
});
parser.register({
  // Images
  '.png': downloader.downloadDomImage,
  '.jpg': downloader.downloadDomImage,
  '.bmp': downloader.downloadDomImage,
  '.jpeg': downloader.downloadDomImage,
  '.gif': downloader.downloadDomImage,
  '.ico': downloader.downloadDomImage,
  '.tiff': downloader.downloadDomImage,
  '.webp': downloader.downloadDomImage,
  '.image': downloader.downloadDomImage,
  // compressed texture
  '.pvr': downloader.downloadDomImage,
  '.pkm': downloader.downloadDomImage,
  '.binary': parseArrayBuffer,
  '.bin': parseArrayBuffer,
  '.dbbin': parseArrayBuffer,
  '.skel': parseArrayBuffer,
  // Text
  '.txt': parseText,
  '.xml': parseText,
  '.vsh': parseText,
  '.fsh': parseText,
  '.atlas': parseText,
  '.tmx': parseText,
  '.tsx': parseText,
  '.fnt': parseText,
  '.plist': parsePlist,
  // Font
  '.font': loadFont,
  '.eot': loadFont,
  '.ttf': loadFont,
  '.woff': loadFont,
  '.svg': loadFont,
  '.ttc': loadFont,
  '.ExportJson': parseJson
});
cc.assetManager.transformPipeline.append(function (task) {
  var input = task.output = task.input;

  for (var i = 0, l = input.length; i < l; i++) {
    var item = input[i];

    if (item.config) {
      item.options.__cacheBundleRoot__ = item.config.name;
    }
  }
});
var originInit = cc.assetManager.init;

cc.assetManager.init = function (options) {
  originInit.call(cc.assetManager, options);
  options.remoteBundles && options.remoteBundles.forEach(function (x) {
    return remoteBundles[x] = true;
  });
  REMOTE_SERVER_ROOT = options.server || '';
  if (REMOTE_SERVER_ROOT && !REMOTE_SERVER_ROOT.endsWith('/')) REMOTE_SERVER_ROOT += '/';
  initJsbDownloader(options.jsbDownloaderMaxTasks, options.jsbDownloaderTimeout);
  cacheManager.init();
};

},{"./jsb-cache-manager":30,"./jsb-fs-utils":35}],38:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (window.middleware === undefined) return;
  var ParticleSystem = cc.ParticleSystem;
  if (ParticleSystem === undefined) return;
  var PSProto = ParticleSystem.prototype;

  PSProto.initProperties = function () {
    this._simulator = new middleware.ParticleSimulator();
    this._previewTimer = null;
    this._focused = false;
    this._texture = null;
    this._renderData = null;
    this._simulator.__particleSystem__ = this;

    this._simulator.setFinishedCallback(function () {
      var self = this.__particleSystem__;

      self._finishedSimulation();
    });

    this._simulator.setStopCallback(function () {
      var self = this.__particleSystem__;
      self.stopSystem();
    });

    this._initProperties();
  }; // value type properties


  var propertiesList = ["positionType", "emissionRate", "totalParticles", "duration", "emitterMode", "life", "lifeVar", "startSize", "startSizeVar", "endSize", "endSizeVar", "startSpin", "startSpinVar", "endSpin", "endSpinVar", "angle", "angleVar", "speed", "speedVar", "radialAccel", "radialAccelVar", "tangentialAccel", "tangentialAccelVar", "rotationIsDir", "startRadius", "startRadiusVar", "endRadius", "endRadiusVar", "rotatePerS", "rotatePerSVar"];
  propertiesList.forEach(function (getSetName) {
    var varName = "_" + getSetName;
    Object.defineProperty(PSProto, getSetName, {
      get: function get() {
        this[varName] === undefined && (this[varName] = 0);
        return this[varName];
      },
      set: function set(val) {
        this[varName] = val;
        this._simulator && (this._simulator[getSetName] = val);
      }
    });
  }); // object type properties

  var objPropList = ['gravity', 'sourcePos', 'posVar', 'startColor', 'startColorVar', 'endColor', 'endColorVar'];
  PSProto._initProperties = function () {
    // init properties
    for (var key in propertiesList) {
      var propName = propertiesList[key];
      this[propName] = this[propName];
    }

    for (var _key in objPropList) {
      var _propName = objPropList[_key];
      this[_propName] = this[_propName];
    }
  }, Object.defineProperty(PSProto, 'gravity', {
    get: function get() {
      !this._gravity && (this._gravity = cc.v2(0, 0));
      return this._gravity;
    },
    set: function set(val) {
      if (!val) return;
      !this._gravity && (this._gravity = cc.v2(0, 0));
      this.gravity.x = val.x;
      this.gravity.y = val.y;
      this._simulator && this._simulator.setGravity(val.x, val.y, 0);
    }
  });
  Object.defineProperty(PSProto, 'sourcePos', {
    get: function get() {
      !this._sourcePos && (this._sourcePos = cc.v2(0, 0));
      return this._sourcePos;
    },
    set: function set(val) {
      if (!val) return;
      !this._sourcePos && (this._sourcePos = cc.v2(0, 0));
      this._sourcePos.x = val.x;
      this._sourcePos.y = val.y;
      this._simulator && this._simulator.setSourcePos(val.x, val.y, 0);
    }
  });
  Object.defineProperty(PSProto, 'posVar', {
    get: function get() {
      !this._posVar && (this._posVar = cc.v2(0, 0));
      return this._posVar;
    },
    set: function set(val) {
      if (!val) return;
      !this._posVar && (this._posVar = cc.v2(0, 0));
      this._posVar.x = val.x;
      this._posVar.y = val.y;
      this._simulator && this._simulator.setPosVar(val.x, val.y, 0);
    }
  });
  Object.defineProperty(PSProto, 'startColor', {
    get: function get() {
      !this._startColor && (this._startColor = cc.color(255, 255, 255, 255));
      return this._startColor;
    },
    set: function set(val) {
      if (!val) return;
      !this._startColor && (this._startColor = cc.color(255, 255, 255, 255));
      this._startColor.r = val.r;
      this._startColor.g = val.g;
      this._startColor.b = val.b;
      this._startColor.a = val.a;
      this._simulator && this._simulator.setStartColor(val.r, val.g, val.b, val.a);
    }
  });
  Object.defineProperty(PSProto, 'startColorVar', {
    get: function get() {
      !this._startColorVar && (this._startColorVar = cc.color(0, 0, 0, 0));
      return this._startColorVar;
    },
    set: function set(val) {
      if (!val) return;
      !this._startColorVar && (this._startColorVar = cc.color(0, 0, 0, 0));
      this._startColorVar.r = val.r;
      this._startColorVar.g = val.g;
      this._startColorVar.b = val.b;
      this._startColorVar.a = val.a;
      this._simulator && this._simulator.setStartColorVar(val.r, val.g, val.b, val.a);
    }
  });
  Object.defineProperty(PSProto, 'endColor', {
    get: function get() {
      !this._endColor && (this._endColor = cc.color(255, 255, 255, 0));
      return this._endColor;
    },
    set: function set(val) {
      if (!val) return;
      !this._endColor && (this._endColor = cc.color(255, 255, 255, 0));
      this._endColor.r = val.r;
      this._endColor.g = val.g;
      this._endColor.b = val.b;
      this._endColor.a = val.a;
      this._simulator && this._simulator.setEndColor(val.r, val.g, val.b, val.a);
    }
  });
  Object.defineProperty(PSProto, 'endColorVar', {
    get: function get() {
      !this._endColorVar && (this._endColorVar = cc.color(0, 0, 0, 0));
      return this._endColorVar;
    },
    set: function set(val) {
      if (!val) return;
      !this._endColorVar && (this._endColorVar = cc.color(0, 0, 0, 0));
      this._endColorVar.r = val.r;
      this._endColorVar.g = val.g;
      this._endColorVar.b = val.b;
      this._endColorVar.a = val.a;
      this._simulator && this._simulator.setEndColorVar(val.r, val.g, val.b, val.a);
    }
  });
  Object.defineProperty(PSProto, 'particleCount', {
    get: function get() {
      if (!this._simulator) {
        return 0;
      }

      return this._simulator.getParticleCount();
    }
  });
  Object.defineProperty(PSProto, 'active', {
    get: function get() {
      if (!this._simulator) {
        return false;
      }

      return this._simulator.active();
    }
  });

  PSProto.onLoad = function () {
    this._simulator.bindNodeProxy(this.node._proxy);
  }; // shield in native


  PSProto.update = null;
  PSProto.lateUpdate = null;

  PSProto._resetAssembler = function () {
    this._assembler = new renderer.CustomAssembler();

    this._assembler.setUseModel(true);

    this.node._proxy.setAssembler(this._assembler);
  };

  var _onEnable = PSProto.onEnable;

  PSProto.onEnable = function () {
    _onEnable.call(this);

    if (this._simulator) {
      this._simulator.onEnable();
    }
  };

  var _onDisable = PSProto.onDisable;

  PSProto.onDisable = function () {
    _onDisable.call(this);

    if (this._simulator) {
      this._simulator.onDisable();
    }
  };

  PSProto._onTextureLoaded = function () {
    this._simulator.updateUVs(this._renderSpriteFrame.uv);

    this._syncAspect();

    this._simulator.aspectRatio = this._aspectRatio || 1.0;

    this._updateMaterial();

    this.markForRender(true);
  };

  var _updateMaterial = PSProto._updateMaterial;

  PSProto._updateMaterial = function () {
    _updateMaterial.call(this);

    var material = this._materials[0];
    material && this._simulator.setEffect(material.effect._nativeObj); // upload hash value to native

    material && material.getHash();
  };

  var _initWithDictionary = PSProto._initWithDictionary;

  PSProto._initWithDictionary = function (content) {
    _initWithDictionary.call(this, content);

    this._initProperties();
  };

  var __preload = PSProto.__preload;

  PSProto.__preload = function () {
    __preload.call(this);

    this._initProperties();
  };
})();

},{}],39:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
// JS to Native bridges
if (window.JavascriptJavaBridge && cc.sys.os == cc.sys.OS_ANDROID) {
  jsb.reflection = new JavascriptJavaBridge();
  cc.sys.capabilities["keyboard"] = true;
} else if (window.JavaScriptObjCBridge && (cc.sys.os == cc.sys.OS_IOS || cc.sys.os == cc.sys.OS_OSX)) {
  jsb.reflection = new JavaScriptObjCBridge();
}

},{}],40:[function(require,module,exports){
"use strict";

var SafeArea = cc.SafeArea;

if (SafeArea) {
  var _onEnable = SafeArea.prototype.onEnable;
  var _onDisable = SafeArea.prototype.onDisable;
  Object.assign(SafeArea.prototype, {
    onEnable: function onEnable() {
      _onEnable.call(this);

      this._adaptSafeAreaChangeWithThis = this.adaptSafeAreaChange.bind(this);
      this._updateAreaWithThis = this.adaptSafeAreaChange.bind(this);
      window.addEventListener('orientationchange', this._adaptSafeAreaChangeWithThis);
      window.addEventListener('safearea-change', this._updateAreaWithThis);
    },
    onDisable: function onDisable() {
      _onDisable.call(this);

      window.removeEventListener('orientationchange', this._adaptSafeAreaChangeWithThis);
      window.removeEventListener('safearea-change', this._updateAreaWithThis);
    },
    adaptSafeAreaChange: function adaptSafeAreaChange() {
      var _this = this;

      if (CC_JSB && (cc.sys.os === cc.sys.OS_IOS || cc.sys.os === cc.sys.OS_ANDROID)) {
        setTimeout(function () {
          _this.updateArea();
        }, 200);
      }
    }
  });
}

},{}],41:[function(require,module,exports){
"use strict";

(function () {
  if (!cc.SkinnedMeshRenderer) return;
  var SkinnedMeshAssembler = cc.SkinnedMeshRenderer.__assembler__.prototype;
  cc.js.mixin(SkinnedMeshAssembler, {
    updateRenderData: function updateRenderData(comp) {
      comp.calcJointMatrix();
      comp.node._renderFlag |= cc.RenderFlow.FLAG_UPDATE_RENDER_DATA;
    }
  });
})();

},{}],42:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var cacheManager = require('./jsb-cache-manager');

(function () {
  if (window.sp === undefined || window.spine === undefined || window.middleware === undefined) return;
  sp.VertexEffectDelegate = spine.VertexEffectDelegate;
  jsb.generateGetSet(spine); // spine global time scale

  Object.defineProperty(sp, 'timeScale', {
    get: function get() {
      return this._timeScale;
    },
    set: function set(value) {
      this._timeScale = value;
      spine.SkeletonAnimation.setGlobalTimeScale(value);
    },
    configurable: true
  });

  var _slotColor = cc.color(0, 0, 255, 255);

  var _boneColor = cc.color(255, 0, 0, 255);

  var _meshColor = cc.color(255, 255, 0, 255);

  var _originColor = cc.color(0, 255, 0, 255);

  var skeletonDataProto = sp.SkeletonData.prototype;
  var _gTextureIdx = 1;
  var _textureKeyMap = {};

  var _textureMap = new WeakMap();

  var skeletonDataMgr = spine.SkeletonDataMgr.getInstance();
  spine.skeletonDataMgr = skeletonDataMgr;
  skeletonDataMgr.setDestroyCallback(function (textureIndex) {
    if (!textureIndex) return;
    var texKey = _textureKeyMap[textureIndex];

    if (texKey && _textureMap.has(texKey)) {
      _textureMap["delete"](texKey);

      delete _textureKeyMap[textureIndex];
    }
  });
  var skeletonCacheMgr = spine.SkeletonCacheMgr.getInstance();
  spine.skeletonCacheMgr = skeletonCacheMgr;

  skeletonDataProto.destroy = function () {
    this.reset();
    skeletonCacheMgr.removeSkeletonCache(this._uuid);
    cc.Asset.prototype.destroy.call(this);
  };

  skeletonDataProto.reset = function () {
    if (this._skeletonCache) {
      spine.disposeSkeletonData(this._uuid);
      this._jsbTextures = null;
      this._skeletonCache = null;
    }

    this._atlasCache = null;
  };

  skeletonDataProto.getRuntimeData = function () {
    if (!this._skeletonCache) {
      this.init();
    }

    return this._skeletonCache;
  };

  skeletonDataProto.init = function () {
    if (this._skeletonCache) return;
    var uuid = this._uuid;

    if (!uuid) {
      cc.errorID(7504);
      return;
    }

    var skeletonCache = spine.retainSkeletonData(uuid);

    if (skeletonCache) {
      this._skeletonCache = skeletonCache;
      this.width = this._skeletonCache.getWidth();
      this.height = this._skeletonCache.getHeight();
      return;
    }

    var atlasText = this.atlasText;

    if (!atlasText) {
      cc.errorID(7508, this.name);
      return;
    }

    var textures = this.textures;
    var textureNames = this.textureNames;

    if (!(textures && textures.length > 0 && textureNames && textureNames.length > 0)) {
      cc.errorID(7507, this.name);
      return;
    }

    var jsbTextures = {};

    for (var i = 0; i < textures.length; ++i) {
      var texture = textures[i];
      var textureIdx = this.recordTexture(texture);
      var spTex = new middleware.Texture2D();
      spTex.setRealTextureIndex(textureIdx);
      spTex.setPixelsWide(texture.width);
      spTex.setPixelsHigh(texture.height);
      spTex.setTexParamCallback(function (texIdx, minFilter, magFilter, wrapS, warpT) {
        var tex = this.getTextureByIndex(texIdx);
        tex.setFilters(minFilter, magFilter);
        tex.setWrapMode(wrapS, warpT);
      }.bind(this));
      spTex.setNativeTexture(texture.getImpl());
      jsbTextures[textureNames[i]] = spTex;
    }

    this._jsbTextures = jsbTextures;
    var filePath = null;

    if (this.skeletonJsonStr) {
      filePath = this.skeletonJsonStr;
    } else {
      filePath = cacheManager.getCache(this.nativeUrl) || this.nativeUrl;
    }

    this._skeletonCache = spine.initSkeletonData(uuid, filePath, atlasText, jsbTextures, this.scale);

    if (this._skeletonCache) {
      this.width = this._skeletonCache.getWidth();
      this.height = this._skeletonCache.getHeight();
    }
  };

  skeletonDataProto.recordTexture = function (texture) {
    var index = _gTextureIdx;
    var texKey = _textureKeyMap[index] = {
      key: index
    };

    _textureMap.set(texKey, texture);

    _gTextureIdx++;
    return index;
  };

  skeletonDataProto.getTextureByIndex = function (textureIdx) {
    var texKey = _textureKeyMap[textureIdx];
    if (!texKey) return;
    return _textureMap.get(texKey);
  };

  var renderCompProto = cc.RenderComponent.prototype;
  var animation = spine.SkeletonAnimation.prototype; // The methods are added to be compatibility with old versions.

  animation.setCompleteListener = function (listener) {
    this._compeleteListener = listener;
    this.setCompleteListenerNative(function (trackEntry) {
      var loopCount = Math.floor(trackEntry.trackTime / trackEntry.animationEnd);
      this._compeleteListener && this._compeleteListener(trackEntry, loopCount);
    });
  }; // The methods are added to be compatibility with old versions.


  animation.setTrackCompleteListener = function (trackEntry, listener) {
    this._trackCompeleteListener = listener;
    this.setTrackCompleteListenerNative(trackEntry, function (trackEntryNative) {
      var loopCount = Math.floor(trackEntryNative.trackTime / trackEntryNative.animationEnd);
      this._trackCompeleteListener && this._trackCompeleteListener(trackEntryNative, loopCount);
    });
  }; // Temporary solution before upgrade the Spine API


  animation.setAnimationListener = function (target, callback) {
    this._target = target;
    this._callback = callback;
    this.setStartListener(function (trackEntry) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.START, null, 0);
      }
    });
    this.setInterruptListener(function (trackEntry) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.INTERRUPT, null, 0);
      }
    });
    this.setEndListener(function (trackEntry) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.END, null, 0);
      }
    });
    this.setDisposeListener(function (trackEntry) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.DISPOSE, null, 0);
      }
    });
    this.setCompleteListener(function (trackEntry, loopCount) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.COMPLETE, null, loopCount);
      }
    });
    this.setEventListener(function (trackEntry, event) {
      if (this._target && this._callback) {
        this._callback.call(this._target, this, trackEntry, sp.AnimationEventType.EVENT, event, 0);
      }
    });
  };

  sp.Skeleton._assembler = null;
  var skeleton = sp.Skeleton.prototype;
  var AnimationCacheMode = sp.Skeleton.AnimationCacheMode;
  Object.defineProperty(skeleton, 'paused', {
    get: function get() {
      return this._paused || false;
    },
    set: function set(value) {
      this._paused = value;

      if (this._nativeSkeleton) {
        this._nativeSkeleton.paused(value);
      }
    }
  });
  Object.defineProperty(skeleton, "premultipliedAlpha", {
    get: function get() {
      if (this._premultipliedAlpha === undefined) {
        return true;
      }

      return this._premultipliedAlpha;
    },
    set: function set(value) {
      this._premultipliedAlpha = value;

      if (this._nativeSkeleton) {
        this._nativeSkeleton.setOpacityModifyRGB(this._premultipliedAlpha);
      }
    }
  });
  Object.defineProperty(skeleton, "timeScale", {
    get: function get() {
      if (this._timeScale === undefined) return 1.0;
      return this._timeScale;
    },
    set: function set(value) {
      this._timeScale = value;

      if (this._nativeSkeleton) {
        this._nativeSkeleton.setTimeScale(this._timeScale);
      }
    }
  });
  var _updateDebugDraw = skeleton._updateDebugDraw;

  skeleton._updateDebugDraw = function () {
    _updateDebugDraw.call(this);

    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setDebugMeshEnabled(this.debugMesh);

      this._nativeSkeleton.setDebugSlotsEnabled(this.debugSlots);

      this._nativeSkeleton.setDebugBonesEnabled(this.debugBones);
    }
  };

  var _updateUseTint = skeleton._updateUseTint;

  skeleton._updateUseTint = function () {
    _updateUseTint.call(this);

    if (this._nativeSkeleton) {
      this._nativeSkeleton.setUseTint(this.useTint);
    }

    this._assembler && this._assembler.clearEffect();
  };

  var _updateBatch = skeleton._updateBatch;

  skeleton._updateBatch = function () {
    _updateBatch.call(this);

    if (this._nativeSkeleton) {
      this._nativeSkeleton.setBatchEnabled(this.enableBatch);
    }

    this._assembler && this._assembler.clearEffect();
  };

  var _onLoad = skeleton.onLoad;

  skeleton.onLoad = function () {
    if (_onLoad) {
      _onLoad.call(this);
    }
  };

  skeleton._resetAssembler = function () {
    this._assembler = new renderer.CustomAssembler();

    this.node._proxy.setAssembler(this._assembler);
  };

  var _updateMaterial = skeleton._updateMaterial;
  var _materialHashMap = {};
  var _materialId = 1;

  skeleton._updateMaterial = function () {
    _updateMaterial.call(this);

    this._assembler && this._assembler.clearEffect();
    var baseMaterial = this.getMaterial(0);

    if (this._nativeSkeleton && baseMaterial) {
      var originHash = baseMaterial.effect.getHash();
      var id = _materialHashMap[originHash] || _materialId++;
      _materialHashMap[originHash] = id;
      baseMaterial.effect.updateHash(id);
      var nativeEffect = baseMaterial.effect._nativeObj;

      this._nativeSkeleton.setEffect(nativeEffect);
    }
  };

  skeleton.setSkeletonData = function (skeletonData) {
    if (null != skeletonData.width && null != skeletonData.height && 0 !== skeletonData.width && 0 !== skeletonData.height) {
      this.node.setContentSize(skeletonData.width, skeletonData.height);
    }

    var uuid = skeletonData._uuid;

    if (!uuid) {
      cc.errorID(7504);
      return;
    }

    var texValues = skeletonData.textures;
    var texKeys = skeletonData.textureNames;

    if (!(texValues && texValues.length > 0 && texKeys && texKeys.length > 0)) {
      cc.errorID(7507, skeletonData.name);
      return;
    }

    if (this._nativeSkeleton) {
      this._nativeSkeleton.stopSchedule();

      this._nativeSkeleton._comp = null;
      this._nativeSkeleton = null;
    }

    var nativeSkeleton = null;

    if (this.isAnimationCached()) {
      nativeSkeleton = new spine.SkeletonCacheAnimation(uuid, this._cacheMode == AnimationCacheMode.SHARED_CACHE);
    } else {
      nativeSkeleton = new spine.SkeletonAnimation();

      try {
        spine.initSkeletonRenderer(nativeSkeleton, uuid);
      } catch (e) {
        cc._throw(e);

        return;
      }

      nativeSkeleton.setDebugSlotsEnabled(this.debugSlots);
      nativeSkeleton.setDebugMeshEnabled(this.debugMesh);
      nativeSkeleton.setDebugBonesEnabled(this.debugBones);
    }

    this._nativeSkeleton = nativeSkeleton;
    nativeSkeleton._comp = this;
    nativeSkeleton.setUseTint(this.useTint);
    nativeSkeleton.setOpacityModifyRGB(this.premultipliedAlpha);
    nativeSkeleton.setTimeScale(this.timeScale);
    nativeSkeleton.setBatchEnabled(this.enableBatch);
    nativeSkeleton.bindNodeProxy(this.node._proxy);
    nativeSkeleton.setColor(this.node.color);
    this._skeleton = nativeSkeleton.getSkeleton(); // init skeleton listener

    this._startListener && this.setStartListener(this._startListener);
    this._endListener && this.setEndListener(this._endListener);
    this._completeListener && this.setCompleteListener(this._completeListener);
    this._eventListener && this.setEventListener(this._eventListener);
    this._interruptListener && this.setInterruptListener(this._interruptListener);
    this._disposeListener && this.setDisposeListener(this._disposeListener);

    this._updateMaterial();

    this.markForRender(true);
  };

  skeleton._updateColor = function () {
    if (this._nativeSkeleton) {
      this._nativeSkeleton.setColor(this.node.color);
    }
  };

  skeleton.setAnimationStateData = function (stateData) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._stateData = stateData;
      return this._nativeSkeleton.setAnimationStateData(stateData);
    }
  };

  skeleton.onEnable = function () {
    renderCompProto.onEnable.call(this);

    if (this._nativeSkeleton) {
      this._nativeSkeleton.onEnable();
    }
  };

  skeleton.onDisable = function () {
    renderCompProto.onDisable.call(this);

    if (this._nativeSkeleton) {
      this._nativeSkeleton.onDisable();
    }
  };

  skeleton.setVertexEffectDelegate = function (effectDelegate) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setVertexEffectDelegate(effectDelegate);
    }
  };

  skeleton.update = function () {
    var nativeSkeleton = this._nativeSkeleton;
    if (!nativeSkeleton) return;
    var node = this.node;
    if (!node) return;

    if (!this.isAnimationCached() && (this.debugBones || this.debugSlots || this.debugMesh) && this._debugRenderer) {
      var graphics = this._debugRenderer;
      graphics.clear();
      graphics.lineWidth = 2;
      var debugData = this._debugData || nativeSkeleton.getDebugData();
      if (!debugData) return;
      var debugIdx = 0,
          debugType = 0,
          debugLen = 0;

      while (true) {
        debugType = debugData[debugIdx++];
        if (debugType == 0) break;
        debugLen = debugData[debugIdx++];

        switch (debugType) {
          case 1:
            // slots
            graphics.strokeColor = _slotColor;

            for (var i = 0; i < debugLen; i += 8) {
              graphics.moveTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.close();
              graphics.stroke();
            }

            break;

          case 2:
            // mesh
            graphics.strokeColor = _meshColor;

            for (var _i = 0; _i < debugLen; _i += 6) {
              graphics.moveTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
              graphics.close();
              graphics.stroke();
            }

            break;

          case 3:
            // bones
            graphics.strokeColor = _boneColor;
            graphics.fillColor = _slotColor; // Root bone color is same as slot color.

            for (var _i2 = 0; _i2 < debugLen; _i2 += 4) {
              var bx = debugData[debugIdx++];
              var by = debugData[debugIdx++];
              var x = debugData[debugIdx++];
              var y = debugData[debugIdx++]; // Bone lengths.

              graphics.moveTo(bx, by);
              graphics.lineTo(x, y);
              graphics.stroke(); // Bone origins.

              graphics.circle(bx, by, Math.PI * 1.5);
              graphics.fill();

              if (_i2 === 0) {
                graphics.fillColor = _originColor;
              }
            }

            break;

          default:
            return;
        }
      }
    }
  };

  skeleton.updateWorldTransform = function () {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.updateWorldTransform();
    }
  };

  skeleton.setToSetupPose = function () {
    if (this._nativeSkeleton) {
      this._nativeSkeleton.setToSetupPose();
    }
  };

  skeleton.setBonesToSetupPose = function () {
    if (this._nativeSkeleton) {
      this._nativeSkeleton.setBonesToSetupPose();
    }
  };

  skeleton.setSlotsToSetupPose = function () {
    if (this._nativeSkeleton) {
      this._nativeSkeleton.setSlotsToSetupPose();
    }
  };

  skeleton.setSlotsRange = function (startSlotIndex, endSlotIndex) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setSlotsRange(startSlotIndex, endSlotIndex);
    }
  };

  skeleton.updateAnimationCache = function (animName) {
    if (!this.isAnimationCached()) return;

    if (this._nativeSkeleton) {
      if (animName) {
        this._nativeSkeleton.updateAnimationCache(animName);
      } else {
        this._nativeSkeleton.updateAllAnimationCache();
      }
    }
  };

  skeleton.invalidAnimationCache = function () {
    if (!this.isAnimationCached()) return;

    if (this._nativeSkeleton) {
      this._nativeSkeleton.updateAllAnimationCache();
    }
  };

  skeleton.findBone = function (boneName) {
    if (this._nativeSkeleton) return this._nativeSkeleton.findBone(boneName);
    return null;
  };

  skeleton.findSlot = function (slotName) {
    if (this._nativeSkeleton) return this._nativeSkeleton.findSlot(slotName);
    return null;
  };

  skeleton.setSkin = function (skinName) {
    if (this._nativeSkeleton) return this._nativeSkeleton.setSkin(skinName);
    return null;
  };

  skeleton.getAttachment = function (slotName, attachmentName) {
    if (this._nativeSkeleton) return this._nativeSkeleton.getAttachment(slotName, attachmentName);
    return null;
  };

  skeleton.setAttachment = function (slotName, attachmentName) {
    this._nativeSkeleton && this._nativeSkeleton.setAttachment(slotName, attachmentName);
  };

  skeleton.getTextureAtlas = function (regionAttachment) {
    cc.warn("sp.Skeleton getTextureAtlas not support in native");
    return null;
  };

  skeleton.setMix = function (fromAnimation, toAnimation, duration) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setMix(fromAnimation, toAnimation, duration);
    }
  };

  skeleton.setAnimation = function (trackIndex, name, loop) {
    if (this._nativeSkeleton) {
      if (this.isAnimationCached()) {
        return this._nativeSkeleton.setAnimation(name, loop);
      } else {
        return this._nativeSkeleton.setAnimation(trackIndex, name, loop);
      }
    }

    return null;
  };

  skeleton.addAnimation = function (trackIndex, name, loop, delay) {
    if (this._nativeSkeleton) {
      delay = delay || 0;

      if (this.isAnimationCached()) {
        return this._nativeSkeleton.addAnimation(name, loop, delay);
      } else {
        return this._nativeSkeleton.addAnimation(trackIndex, name, loop, delay);
      }
    }

    return null;
  };

  skeleton.findAnimation = function (name) {
    if (this._nativeSkeleton) return this._nativeSkeleton.findAnimation(name);
    return null;
  };

  skeleton.getCurrent = function (trackIndex) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      return this._nativeSkeleton.getCurrent(trackIndex);
    }

    return null;
  };

  skeleton.clearTracks = function () {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.clearTracks();
    }
  };

  skeleton.clearTrack = function (trackIndex) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.clearTrack(trackIndex);
    }
  };

  skeleton.setStartListener = function (listener) {
    this._startListener = listener;

    if (this._nativeSkeleton) {
      if (this.isAnimationCached()) {
        this._nativeSkeleton.setStartListener(function (animationName) {
          var self = this._comp;
          self._startEntry.animation.name = animationName;
          self._startListener && self._startListener(self._startEntry);
        });
      } else {
        this._nativeSkeleton.setStartListener(listener);
      }
    }
  };

  skeleton.setInterruptListener = function (listener) {
    this._interruptListener = listener;

    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setInterruptListener(listener);
    }
  };

  skeleton.setEndListener = function (listener) {
    this._endListener = listener;

    if (this._nativeSkeleton) {
      if (this.isAnimationCached()) {
        this._nativeSkeleton.setEndListener(function (animationName) {
          var self = this._comp;
          self._endEntry.animation.name = animationName;
          self._endListener && self._endListener(self._endEntry);
        });
      } else {
        this._nativeSkeleton.setEndListener(listener);
      }
    }
  };

  skeleton.setDisposeListener = function (listener) {
    this._disposeListener = listener;

    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setDisposeListener(listener);
    }
  };

  skeleton.setCompleteListener = function (listener) {
    this._completeListener = listener;

    if (this._nativeSkeleton) {
      if (this.isAnimationCached()) {
        this._nativeSkeleton.setCompleteListener(function (animationName) {
          var self = this._comp;
          self._endEntry.animation.name = animationName;
          self._completeListener && self._completeListener(self._endEntry);
        });
      } else {
        this._nativeSkeleton.setCompleteListener(listener);
      }
    }
  };

  skeleton.setEventListener = function (listener) {
    this._eventListener = listener;

    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setEventListener(listener);
    }
  };

  skeleton.setTrackStartListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackStartListener(entry, listener);
    }
  };

  skeleton.setTrackInterruptListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackInterruptListener(entry, listener);
    }
  };

  skeleton.setTrackEndListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackEndListener(entry, listener);
    }
  };

  skeleton.setTrackDisposeListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackDisposeListener(entry, listener);
    }
  };

  skeleton.setTrackCompleteListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackCompleteListener(entry, listener);
    }
  };

  skeleton.setTrackEventListener = function (entry, listener) {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      this._nativeSkeleton.setTrackEventListener(entry, listener);
    }
  };

  skeleton.getState = function () {
    if (this._nativeSkeleton && !this.isAnimationCached()) {
      return this._nativeSkeleton.getState();
    }
  };

  skeleton._ensureListener = function () {
    cc.warn("sp.Skeleton _ensureListener not need in native");
  };

  skeleton._updateSkeletonData = function () {
    if (this.skeletonData) {
      this.skeletonData.init();
      this.setSkeletonData(this.skeletonData);
      this.attachUtil.init(this);

      this.attachUtil._associateAttachedNode();

      this._preCacheMode = this._cacheMode;
      this.defaultSkin && this._nativeSkeleton.setSkin(this.defaultSkin);
      this.animation = this.defaultAnimation;
    } else {
      if (this._nativeSkeleton) {
        this._nativeSkeleton.stopSchedule();

        this._nativeSkeleton._comp = null;
        this._nativeSkeleton = null;
      }
    }
  };

  var _onDestroy = skeleton.onDestroy;

  skeleton.onDestroy = function () {
    _onDestroy.call(this);

    if (this._nativeSkeleton) {
      this._nativeSkeleton.stopSchedule();

      this._nativeSkeleton._comp = null;
      this._nativeSkeleton = null;
    }

    this._stateData = null;
    this._materialCache = null;
  }; ////////////////////////////////////////////////////////////
  // adapt attach util
  ////////////////////////////////////////////////////////////


  var attachUtilProto = sp.AttachUtil.prototype;
  var _attachUtilInit = attachUtilProto.init;

  attachUtilProto.init = function (skeletonComp) {
    _attachUtilInit.call(this, skeletonComp);

    this._nativeSkeleton = skeletonComp._nativeSkeleton;
    this._attachUtilNative = null;
  };

  var _generateAllAttachedNodes = attachUtilProto.generateAllAttachedNodes;

  attachUtilProto.generateAllAttachedNodes = function () {
    var res = _generateAllAttachedNodes.call(this);

    this._associateAttachedNode();

    return res;
  };

  var _generateAttachedNodes = attachUtilProto.generateAttachedNodes;

  attachUtilProto.generateAttachedNodes = function (boneName) {
    var res = _generateAttachedNodes.call(this, boneName);

    this._associateAttachedNode();

    return res;
  };

  var _associateAttachedNode = attachUtilProto._associateAttachedNode;

  attachUtilProto._associateAttachedNode = function () {
    if (!this._inited) return;

    var rootNode = this._skeletonNode.getChildByName('ATTACHED_NODE_TREE');

    if (!rootNode || !rootNode.isValid) return; // associate js

    _associateAttachedNode.call(this); // associate native


    if (!this._attachUtilNative) {
      if (this._skeletonComp.isAnimationCached()) {
        this._attachUtilNative = new spine.CacheModeAttachUtil();
      } else {
        this._attachUtilNative = new spine.RealTimeAttachUtil();
      }

      this._nativeSkeleton.setAttachUtil(this._attachUtilNative);
    }

    this._attachUtilNative.associateAttachedNode(this._skeleton, this._skeletonNode._proxy);
  };
})();

},{"./jsb-cache-manager":30}],43:[function(require,module,exports){
/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var sys = cc.sys;
sys.getNetworkType = jsb.Device.getNetworkType;
sys.getBatteryLevel = jsb.Device.getBatteryLevel;
sys.garbageCollect = jsb.garbageCollect;
sys.restartVM = __restartVM;
sys.isObjectValid = __isObjectValid;

sys.getSafeAreaRect = function () {
  // x(top), y(left), z(bottom), w(right)
  var edge = jsb.Device.getSafeAreaEdge();
  var screenSize = cc.view.getFrameSize(); // Get leftBottom and rightTop point in UI coordinates

  var leftBottom = new cc.Vec2(edge.y, screenSize.height - edge.z);
  var rightTop = new cc.Vec2(screenSize.width - edge.w, edge.x); // Returns the real location in view.

  var relatedPos = {
    left: 0,
    top: 0,
    width: screenSize.width,
    height: screenSize.height
  };
  cc.view.convertToLocationInView(leftBottom.x, leftBottom.y, relatedPos, leftBottom);
  cc.view.convertToLocationInView(rightTop.x, rightTop.y, relatedPos, rightTop); // convert view point to design resolution size

  cc.view._convertPointWithScale(leftBottom);

  cc.view._convertPointWithScale(rightTop);

  return cc.rect(leftBottom.x, leftBottom.y, rightTop.x - leftBottom.x, rightTop.y - leftBottom.y);
};

},{}],44:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!cc.TiledMap) return;
  var RenderFlow = cc.RenderFlow; // tiled layer

  var TiledLayer = cc.TiledLayer.prototype;
  var _addUserNode = TiledLayer.addUserNode;

  TiledLayer.addUserNode = function (node) {
    var result = _addUserNode.call(this, node);

    if (result) {
      var proxy = node._proxy;
      proxy && proxy.enableVisit(false);
    }
  };

  var _removeUserNode = TiledLayer.removeUserNode;

  TiledLayer.removeUserNode = function (node) {
    var result = _removeUserNode.call(this, node);

    if (result) {
      var proxy = node._proxy;
      proxy && proxy.enableVisit(true);
    }
  }; // override _buildMaterial to upload hash value to native


  var _buildMaterial = TiledLayer._buildMaterial;

  TiledLayer._buildMaterial = function (tilesetIdx) {
    var material = _buildMaterial.call(this, tilesetIdx);

    if (material) material.getHash();
  }; // tiledmap buffer


  var TiledMapBuffer = cc.TiledMapBuffer.prototype;

  TiledMapBuffer._updateOffset = function () {
    var offsetInfo = this._offsetInfo;
    offsetInfo.vertexOffset = this.vertexOffset;
    offsetInfo.indiceOffset = this.indiceOffset;
    offsetInfo.byteOffset = this.byteOffset;
  }; // tiledmap render data list


  var TiledMapRenderDataList = cc.TiledMapRenderDataList.prototype;

  TiledMapRenderDataList._pushRenderData = function () {
    var renderData = {};
    renderData.ia = {};
    renderData.nodesRenderList = [];

    this._dataList.push(renderData);
  };

  TiledMapRenderDataList.reset = function () {
    this._offset = 0;
    var assembler = this._nativeAssembler;
    assembler._effect.length = 0;
    assembler.reset();
  };

  TiledMapRenderDataList.setNativeAssembler = function (assembler) {
    this._nativeAssembler = assembler;
  };

  TiledMapRenderDataList.popRenderData = function (buffer) {
    if (this._offset >= this._dataList.length) {
      this._pushRenderData();
    }

    var renderData = this._dataList[this._offset];
    renderData.nodesRenderList.length = 0;

    this._nativeAssembler.clearNodes(this._offset);

    var ia = renderData.ia;
    ia._meshIndex = buffer.getCurMeshIndex();
    ia._start = buffer.indiceOffset;
    ia._count = 0;
    ia._verticesStart = buffer.vertexOffset;
    ia._index = this._offset;
    this._offset++;
    return renderData;
  };

  TiledMapRenderDataList.pushNodesList = function (renderData, nodesList) {
    var nodesRenderList = renderData.nodesRenderList;
    nodesRenderList.push(nodesList);
    var nativeNodes = [];

    for (var j = 0; j < nodesRenderList.length; j++) {
      var _nodesList = nodesRenderList[j];
      if (!_nodesList) continue;

      for (var idx = 0; idx < _nodesList.length; idx++) {
        var dataComp = _nodesList[idx];
        if (!dataComp) continue;
        nativeNodes.push(dataComp.node._id);
      }
    }

    this._nativeAssembler.updateNodes(renderData.ia._index, nativeNodes);
  };

  var ModelBatcherDelegate = cc.Class({
    ctor: function ctor() {
      this._nativeAssembler = null;
    },
    setNativeAssembler: function setNativeAssembler(assembler) {
      this._nativeAssembler = assembler;
    },
    setBuffer: function setBuffer(buffer) {
      this._buffer = buffer;
    },
    _flushIA: function _flushIA(ia) {
      var iaIndex = ia._index;
      var meshIndex = ia._meshIndex;

      this._nativeAssembler.updateMeshIndex(iaIndex, meshIndex);

      var verticesStart = ia._verticesStart;
      var verticesOffset = this._buffer.vertexOffset;
      var vertexCount = verticesOffset - verticesStart;

      this._nativeAssembler.updateVerticesRange(iaIndex, verticesStart, vertexCount);

      this._nativeAssembler.updateIndicesRange(iaIndex, ia._start, ia._count);

      this._nativeAssembler.updateMaterial(iaIndex, this.material);
    },
    _flush: function _flush() {}
  });
  var TiledMapAssembler = cc.TiledLayer.__assembler__.prototype;
  var _fillBuffers = TiledMapAssembler.fillBuffers;
  cc.js.mixin(TiledMapAssembler, {
    _extendNative: function _extendNative() {
      renderer.TiledMapAssembler.prototype.ctor.call(this);
    },
    // override _updateRenderData function avoid base class cover material
    _updateRenderData: function _updateRenderData() {
      if (!this._renderComp || !this._renderComp.isValid) return;
      this.updateRenderData(this._renderComp);
    },
    updateRenderData: function updateRenderData(comp) {
      if (!comp._modelBatcherDelegate) {
        comp._buffer = new cc.TiledMapBuffer(null, cc.gfx.VertexFormat.XY_UV_Color);
        comp._renderDataList = new cc.TiledMapRenderDataList();
        comp._modelBatcherDelegate = new ModelBatcherDelegate();

        comp._buffer.setNativeAssembler(this);

        comp._renderDataList.setNativeAssembler(this);

        comp._modelBatcherDelegate.setBuffer(comp._buffer);

        comp._modelBatcherDelegate.setNativeAssembler(this);
      }

      _fillBuffers.call(this, comp, comp._modelBatcherDelegate);

      comp.node._renderFlag |= RenderFlow.FLAG_UPDATE_RENDER_DATA;
    }
  }, renderer.TiledMapAssembler.prototype);
})();

},{}],45:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!(cc && cc.VideoPlayer && cc.VideoPlayer.Impl)) {
    return;
  }

  var vec3 = cc.Vec3;

  var _worldMat = new cc.Mat4();

  var _topLeft = new vec3();

  var _bottomRight = new vec3();

  var _impl = cc.VideoPlayer.Impl;
  var _p = cc.VideoPlayer.Impl.prototype;

  _p._bindEvent = function () {
    var video = this._video,
        self = this;

    if (!video) {
      return;
    } //binding event


    var cbs = this.__eventListeners;

    cbs.loadedmetadata = function () {
      self._loadedmeta = true;

      self._dispatchEvent(_impl.EventType.META_LOADED);

      if (self._playing) {
        self._video.play();
      }
    };

    cbs.ended = function () {
      if (self._video !== video) return;
      self._playing = false;

      self._dispatchEvent(_impl.EventType.COMPLETED);
    };

    cbs.play = function () {
      if (self._video !== video) return;
      self._playing = true;

      self._dispatchEvent(_impl.EventType.PLAYING);
    };

    cbs.pause = function () {
      if (self._ignorePause || self._video !== video) return;
      self._playing = false;

      self._dispatchEvent(_impl.EventType.PAUSED);
    };

    cbs.click = function () {
      self._dispatchEvent(_impl.EventType.CLICKED);
    };

    cbs.stoped = function () {
      self._dispatchEvent(_impl.EventType.STOPPED);

      self._ignorePause = false;
    };

    video.addEventListener("loadedmetadata", cbs.loadedmetadata);
    video.addEventListener("ended", cbs.ended);
    video.addEventListener("play", cbs.play);
    video.addEventListener("pause", cbs.pause);
    video.addEventListener("click", cbs.click);
    video.addEventListener("stoped", cbs.stoped);

    function onCanPlay() {
      if (this._loaded) return;
      this._loaded = true;

      this._dispatchEvent(_impl.EventType.READY_TO_PLAY);

      this._updateVisibility();
    }

    cbs.onCanPlay = onCanPlay.bind(this);
    video.addEventListener('canplay', cbs.onCanPlay);
    video.addEventListener('canplaythrough', cbs.onCanPlay);
    video.addEventListener('suspend', cbs.onCanPlay);
  };

  _p._updateVisibility = function () {
    if (!this._video) return;
    var video = this._video;

    if (this._visible) {
      this._video.setVisible(true);
    } else {
      this._video.setVisible(false);

      video.pause();
      this._playing = false;
    }
  };

  _p._updateSize = function (width, height) {};

  _p.createDomElementIfNeeded = function () {
    if (!jsb.VideoPlayer) {
      cc.warn('VideoPlayer is not supported.');
      return null;
    }

    if (!this._video) {
      this._video = new jsb.VideoPlayer();
    }
  };

  _p.removeDom = function () {
    var video = this._video;

    if (video) {
      video.stop();
      video.setVisible(false);
      var cbs = this.__eventListeners;
      cbs.loadedmetadata = null;
      cbs.ended = null;
      cbs.play = null;
      cbs.pause = null;
      cbs.click = null;
      cbs.onCanPlay = null;
      video.destroy();
    }

    this._video = null;
    this._url = "";
  };

  _p.setURL = function (path) {
    var source, extname;

    if (this._url === path) {
      return;
    }

    this.removeDom();
    this._url = path;
    this.createDomElementIfNeeded();

    this._bindEvent();

    var video = this._video;

    if (!video) {
      return;
    }

    video.setVisible(this._visible);
    this._loaded = false;
    this._played = false;
    this._playing = false;
    this._loadedmeta = false;
    video.setURL(this._url);
    this._forceUpdate = true;
  };

  _p.getURL = function () {
    return this._url;
  };

  _p.play = function () {
    var video = this._video;
    if (!video || !this._visible || this._playing) return;
    video.play();
    this._playing = true;
  };

  _p.setStayOnBottom = function (enabled) {};

  _p.pause = function () {
    var video = this._video;
    if (!this._playing || !video) return;
    video.pause();
    this._playing = false;
  };

  _p.resume = function () {
    var video = this._video;
    if (this._playing || !video) return;
    video.resume();
    this._playing = true;
  };

  _p.stop = function () {
    var video = this._video;
    if (!video || !this._visible) return;
    this._ignorePause = true;
    video.stop();
    this._playing = false;
  };

  _p.setVolume = function (volume) {};

  _p.seekTo = function (time) {
    var video = this._video;
    if (!video) return;

    if (this._loaded) {
      video.seekTo(time);
    } else {
      var cb = function cb() {
        video.seekTo(time);
      };

      video.addEventListener(_impl._polyfill.event, cb);
    }
  };

  _p.isPlaying = function () {
    return this._playing;
  };

  _p.duration = function () {
    var video = this._video;
    var duration = -1;
    if (!video) return duration;
    duration = video.duration();

    if (duration <= 0) {
      cc.logID(7702);
    }

    return duration;
  };

  _p.currentTime = function () {
    var video = this._video;
    if (!video) return -1;
    return video.currentTime();
  };

  _p.getFrame = function () {
    var video = this._video;
    if (!video) return;
    video.getFrame();
  };

  _p.getFrameChannel = function () {
    var video = this._video;
    if (!video) return 0;
    return video.getFrameChannel();
  };

  _p.getFrameWidth = function () {
    var video = this._video;
    if (!video) return 0;
    return video.getFrameWidth();
  };

  _p.getFrameHeight = function () {
    var video = this._video;
    if (!video) return 0;
    return video.getFrameHeight();
  };

  _p.pushFrameDataToTexture2D = function (tex) {
    var video = this._video;
    if (!video) return;
    video.pushFrameDataToTexture2D(tex);
  };

  _p.getVideoTexDataSize = function () {
    var video = this._video;
    if (!video) return 0;
    return video.getVideoTexDataSize();
  };

  _p.setShowRawFrame = function (show) {
    var video = this._video;
    if (!video) return;
    video.setShowRawFrame(show);
  };

  _p.update = function () {
    var video = this._video;
    if (!video) return;
    video.update();
  };

  _p.setKeepAspectRatioEnabled = function (isEnabled) {
    if (!this._video) {
      return false;
    }

    return this._video.setKeepAspectRatioEnabled(isEnabled);
  };

  _p.isKeepAspectRatioEnabled = function () {
    if (!this._video) {
      return false;
    }

    return this._video.isKeepAspectRatioEnabled();
  };

  _p.isFullScreenEnabled = function () {
    return this._fullScreenEnabled;
  };

  _p.setEventListener = function (event, callback) {
    this._EventList[event] = callback;
  };

  _p.removeEventListener = function (event) {
    this._EventList[event] = null;
  };

  _p._dispatchEvent = function (event) {
    var callback = this._EventList[event];
    if (callback) callback.call(this, this, this._video.src);
  };

  _p.onPlayEvent = function () {
    var callback = this._EventList[_impl.EventType.PLAYING];
    callback.call(this, this, this._video.src);
  };

  _p.enable = function () {
    var list = _impl.elements;
    if (list.indexOf(this) === -1) list.push(this);
    this.setVisible(true);
  };

  _p.disable = function () {
    var list = _impl.elements;
    var index = list.indexOf(this);
    if (index !== -1) list.splice(index, 1);
    this.setVisible(false);
  };

  _p.destroy = function () {
    this.disable();
    this.removeDom();
  };

  _p.setVisible = function (visible) {
    if (this._visible !== visible) {
      this._visible = !!visible;

      this._updateVisibility();
    }
  };

  _p.setFullScreenEnabled = function (enable) {
    var video = this._video;

    if (!video) {
      return;
    }

    this._fullScreenEnabled = enable;
    video.setFullScreenEnabled(enable);
  };

  _p.updateMatrix = function (node) {
    if (!this._video || !this._visible) return;

    var camera = cc.Camera.findCamera(node)._camera;

    if (!camera) {
      return;
    }

    node.getWorldMatrix(_worldMat);

    if (!this._forceUpdate && this._m00 === _worldMat.m[0] && this._m01 === _worldMat.m[1] && this._m04 === _worldMat.m[4] && this._m05 === _worldMat.m[5] && this._m12 === _worldMat.m[12] && this._m13 === _worldMat.m[13] && this._w === node._contentSize.width && this._h === node._contentSize.height) {
      return;
    } // update matrix cache


    this._m00 = _worldMat.m[0];
    this._m01 = _worldMat.m[1];
    this._m04 = _worldMat.m[4];
    this._m05 = _worldMat.m[5];
    this._m12 = _worldMat.m[12];
    this._m13 = _worldMat.m[13];
    this._w = node._contentSize.width;
    this._h = node._contentSize.height;
    var canvas_width = cc.game.canvas.width;
    var canvas_height = cc.game.canvas.height;
    var ap = node._anchorPoint; // Vectors in node space

    vec3.set(_topLeft, -ap.x * this._w, (1.0 - ap.y) * this._h, 0);
    vec3.set(_bottomRight, (1 - ap.x) * this._w, -ap.y * this._h, 0); // Convert to world space

    vec3.transformMat4(_topLeft, _topLeft, _worldMat);
    vec3.transformMat4(_bottomRight, _bottomRight, _worldMat); // Convert to Screen space

    camera.worldToScreen(_topLeft, _topLeft, canvas_width, canvas_height);
    camera.worldToScreen(_bottomRight, _bottomRight, canvas_width, canvas_height);
    var finalWidth = _bottomRight.x - _topLeft.x;
    var finalHeight = _topLeft.y - _bottomRight.y;

    this._video.setFrame(_topLeft.x, canvas_height - _topLeft.y, finalWidth, finalHeight);
  };

  _impl.EventType = {
    PLAYING: 0,
    PAUSED: 1,
    STOPPED: 2,
    COMPLETED: 3,
    META_LOADED: 4,
    CLICKED: 5,
    READY_TO_PLAY: 6
  }; // video 队列，所有 vidoe 在 onEnter 的时候都会插入这个队列

  _impl.elements = []; // video 在 game_hide 事件中被自动暂停的队列，用于回复的时候重新开始播放

  _impl.pauseElements = [];
  cc.game.on(cc.game.EVENT_HIDE, function () {
    var list = _impl.elements;

    for (var element, i = 0; i < list.length; i++) {
      element = list[i];

      if (element.isPlaying()) {
        element.pause();

        _impl.pauseElements.push(element);
      }
    }
  });
  cc.game.on(cc.game.EVENT_SHOW, function () {
    var list = _impl.pauseElements;
    var element = list.pop();

    while (element) {
      element.play();
      element = list.pop();
    }
  });
})();

},{}],46:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!(cc && cc.WebView && cc.WebView.Impl)) {
    return;
  }

  var vec3 = cc.Vec3;

  var _worldMat = new cc.Mat4();

  var _topLeft = new vec3();

  var _bottomRight = new vec3();

  cc.WebView.Impl = cc.Class({
    "extends": cc.WebView.Impl,
    ctor: function ctor() {
      // keep webview data
      this.jsCallback = null;
      this.interfaceSchema = null;
    }
  });
  var _impl = cc.WebView.Impl;
  var _p = cc.WebView.Impl.prototype;

  _p._updateVisibility = function () {
    if (!this._iframe) return;

    this._iframe.setVisible(this._visible);
  };

  _p._updateSize = function (w, h) {};

  _p._initEvent = function () {
    var iframe = this._iframe;

    if (iframe) {
      var cbs = this.__eventListeners,
          self = this;

      cbs.load = function () {
        self._dispatchEvent(_impl.EventType.LOADED);
      };

      cbs.error = function () {
        self._dispatchEvent(_impl.EventType.ERROR);
      }; // native event callback


      this._iframe.setOnDidFinishLoading(cbs.load);

      this._iframe.setOnDidFailLoading(cbs.error);
    }
  };

  _p._initExtraSetting = function () {
    this.jsCallback && this.setOnJSCallback(this.jsCallback);
    this.interfaceSchema && this.setJavascriptInterfaceScheme(this.interfaceSchema); // remove obj

    this.jsCallback = null;
    this.interfaceSchema = null;
  };

  _p._setOpacity = function (opacity) {
    var iframe = this._iframe;

    if (iframe && iframe.style) {
      iframe.style.opacity = opacity / 255; // TODO, add impl to Native
    }
  };

  _p.createDomElementIfNeeded = function (w, h) {
    if (!jsb.WebView) {
      cc.warn('WebView only supports mobile platform.');
      return;
    }

    if (!this._iframe) {
      this._iframe = jsb.WebView.create();

      this._initEvent();

      this._initExtraSetting();
    }
  };

  _p.removeDom = function () {
    var iframe = this._iframe;

    if (iframe) {
      var cbs = this.__eventListeners;
      cbs.load = null;
      cbs.error = null;
      iframe.destroy();
      this._iframe = null;
    }
  };

  _p.setOnJSCallback = function (callback) {
    var iframe = this._iframe;

    if (iframe) {
      iframe.setOnJSCallback(callback);
    } else {
      this.jsCallback = callback;
    }
  };

  _p.setJavascriptInterfaceScheme = function (scheme) {
    var iframe = this._iframe;

    if (iframe) {
      iframe.setJavascriptInterfaceScheme(scheme);
    } else {
      this.interfaceSchema = scheme;
    }
  };

  _p.loadData = function (data, MIMEType, encoding, baseURL) {
    var iframe = this._iframe;

    if (iframe) {
      iframe.loadData(data, MIMEType, encoding, baseURL);
    }
  };

  _p.loadHTMLString = function (string, baseURL) {
    var iframe = this._iframe;

    if (iframe) {
      iframe.loadHTMLString(string, baseURL);
    }
  };
  /**
   * Load an URL
   * @param {String} url
   */


  _p.loadURL = function (url) {
    var iframe = this._iframe;

    if (iframe) {
      iframe.src = url;
      iframe.loadURL(url);

      this._dispatchEvent(_impl.EventType.LOADING);
    }
  };
  /**
   * Stop loading
   */


  _p.stopLoading = function () {
    cc.logID(7800);
  };
  /**
   * Reload the WebView
   */


  _p.reload = function () {
    var iframe = this._iframe;

    if (iframe) {
      iframe.reload();
    }
  };
  /**
   * Determine whether to go back
   */


  _p.canGoBack = function () {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.canGoBack();
    }
  };
  /**
   * Determine whether to go forward
   */


  _p.canGoForward = function () {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.canGoForward();
    }
  };
  /**
   * go back
   */


  _p.goBack = function () {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.goBack();
    }
  };
  /**
   * go forward
   */


  _p.goForward = function () {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.goForward();
    }
  };
  /**
   * In the webview execution within a period of js string
   * @param {String} str
   */


  _p.evaluateJS = function (str) {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.evaluateJS(str);
    }
  };
  /**
   * Limited scale
   */


  _p.setScalesPageToFit = function () {
    var iframe = this._iframe;

    if (iframe) {
      return iframe.setScalesPageToFit();
    }
  };
  /**
   * The binding event
   * @param {_impl.EventType} event
   * @param {Function} callback
   */


  _p.setEventListener = function (event, callback) {
    this._EventList[event] = callback;
  };
  /**
   * Delete events
   * @param {_impl.EventType} event
   */


  _p.removeEventListener = function (event) {
    this._EventList[event] = null;
  };

  _p._dispatchEvent = function (event) {
    var callback = this._EventList[event];
    if (callback) callback.call(this, this, this._iframe.src);
  };

  _p._createRenderCmd = function () {
    return new _impl.RenderCmd(this);
  };

  _p.destroy = function () {
    this.removeDom();
  };

  _p.setVisible = function (visible) {
    if (this._visible !== visible) {
      this._visible = !!visible;

      this._updateVisibility();
    }
  };

  _p.updateMatrix = function (node) {
    if (!this._iframe || !this._visible) return;

    var camera = cc.Camera.findCamera(node)._camera;

    if (!camera) {
      return;
    }

    node.getWorldMatrix(_worldMat);

    if (this._m00 === _worldMat.m[0] && this._m01 === _worldMat.m[1] && this._m04 === _worldMat.m[4] && this._m05 === _worldMat.m[5] && this._m12 === _worldMat.m[12] && this._m13 === _worldMat.m[13] && this._w === node._contentSize.width && this._h === node._contentSize.height) {
      return;
    } // update matrix cache


    this._m00 = _worldMat.m[0];
    this._m01 = _worldMat.m[1];
    this._m04 = _worldMat.m[4];
    this._m05 = _worldMat.m[5];
    this._m12 = _worldMat.m[12];
    this._m13 = _worldMat.m[13];
    this._w = node._contentSize.width;
    this._h = node._contentSize.height;
    var canvas_width = cc.game.canvas.width;
    var canvas_height = cc.game.canvas.height;
    var ap = node._anchorPoint; // Vectors in node space

    vec3.set(_topLeft, -ap.x * this._w, (1.0 - ap.y) * this._h, 0);
    vec3.set(_bottomRight, (1 - ap.x) * this._w, -ap.y * this._h, 0); // Convert to world space

    vec3.transformMat4(_topLeft, _topLeft, _worldMat);
    vec3.transformMat4(_bottomRight, _bottomRight, _worldMat); // Convert to screen space

    camera.worldToScreen(_topLeft, _topLeft, canvas_width, canvas_height);
    camera.worldToScreen(_bottomRight, _bottomRight, canvas_width, canvas_height);
    var finalWidth = _bottomRight.x - _topLeft.x;
    var finalHeight = _topLeft.y - _bottomRight.y;

    this._iframe.setFrame(_topLeft.x, canvas_height - _topLeft.y, finalWidth, finalHeight);
  };
})();

},{}],47:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var nativeCameraProto = renderer.Camera.prototype;
var _setNode = nativeCameraProto.setNode;
cc.js.mixin(nativeCameraProto, {
  setNode: function setNode(node) {
    this._persistentNode = node;

    _setNode.call(this, node);
  }
});

},{}],48:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var nativeLightProto = renderer.Light.prototype;
var _setNode = nativeLightProto.setNode;
cc.js.mixin(nativeLightProto, {
  setNode: function setNode(node) {
    this._node = node;

    _setNode.call(this, node);
  }
});

},{}],49:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!cc.MeshBuffer) return;
  var MeshBuffer = cc.MeshBuffer.prototype;

  MeshBuffer.init = function (batcher, vertexFormat) {
    this.byteOffset = 0;
    this.indiceOffset = 0;
    this.vertexOffset = 0;
    this._vertexFormat = vertexFormat;
    this._vertexBytes = this._vertexFormat._bytes;
    this._vDatas = [];
    this._uintVDatas = [];
    this._iDatas = [];
    this._arrOffset = 0;
    this._vData = null;
    this._uintVData = null;
    this._iData = null;
    this._initVDataCount = 256 * vertexFormat._bytes; // actually 256 * 4 * (vertexFormat._bytes / 4)

    this._initIDataCount = 256 * 6;
    this._offsetInfo = {
      byteOffset: 0,
      vertexOffset: 0,
      indiceOffset: 0
    };
    this._renderDataList = new renderer.RenderDataList();

    this._reallocBuffer();
  };

  MeshBuffer.setNativeAssembler = function (assembler) {
    if (assembler !== this._nativeAssembler) {
      this._nativeAssembler = assembler;
      assembler.setRenderDataList(this._renderDataList);
    }
  };

  MeshBuffer._updateVIDatas = function () {
    var offset = this._arrOffset;
    this._vDatas[offset] = this._vData;
    this._uintVDatas[offset] = this._uintVData;
    this._iDatas[offset] = this._iData;

    this._renderDataList.updateMesh(offset, this._vData, this._iData);
  };

  MeshBuffer.getNativeAssembler = function () {
    return this._nativeAssembler;
  };

  MeshBuffer.getCurMeshIndex = function () {
    return this._arrOffset;
  };

  MeshBuffer.uploadData = function () {};

  MeshBuffer.switchBuffer = function () {
    var offset = ++this._arrOffset;
    this.byteOffset = 0;
    this.vertexOffset = 0;
    this.indiceOffset = 0;

    if (offset < this._vDatas.length) {
      this._vData = this._vDatas[offset];
      this._uintVData = this._uintVDatas[offset];
      this._iData = this._iDatas[offset];
    } else {
      this._reallocBuffer();
    }
  };

  MeshBuffer.checkAndSwitchBuffer = function (vertexCount) {
    if (this.vertexOffset + vertexCount > 65535) {
      this.switchBuffer();
      if (!this._nativeAssembler) return;
      this._nativeAssembler.updateIADatas && this._nativeAssembler.updateIADatas(this._arrOffset, this._arrOffset);
    }
  };

  MeshBuffer.used = function (vertexCount, indiceCount) {
    if (!this._nativeAssembler) return;

    this._nativeAssembler.updateVerticesRange(this._arrOffset, 0, vertexCount);

    this._nativeAssembler.updateIndicesRange(this._arrOffset, 0, indiceCount);
  };

  MeshBuffer.request = function (vertexCount, indiceCount) {
    this.requestStatic(vertexCount, indiceCount);
    return this._offsetInfo;
  };

  MeshBuffer._reallocBuffer = function () {
    this._reallocVData(true);

    this._reallocIData(true);

    this._updateVIDatas();
  };

  MeshBuffer._reallocVData = function (copyOldData) {
    var oldVData;

    if (this._vData) {
      oldVData = new Uint8Array(this._vData.buffer);
    }

    this._vData = new Float32Array(this._initVDataCount);
    this._uintVData = new Uint32Array(this._vData.buffer);
    var newData = new Uint8Array(this._uintVData.buffer);

    if (oldVData && copyOldData) {
      for (var i = 0, l = oldVData.length; i < l; i++) {
        newData[i] = oldVData[i];
      }
    }
  };

  MeshBuffer._reallocIData = function (copyOldData) {
    var oldIData = this._iData;
    this._iData = new Uint16Array(this._initIDataCount);

    if (oldIData && copyOldData) {
      var iData = this._iData;

      for (var i = 0, l = oldIData.length; i < l; i++) {
        iData[i] = oldIData[i];
      }
    }
  };

  MeshBuffer.reset = function () {
    this._arrOffset = 0;
    this._vData = this._vDatas[0];
    this._uintVData = this._uintVDatas[0];
    this._iData = this._iDatas[0];
    this.byteOffset = 0;
    this.indiceOffset = 0;
    this.vertexOffset = 0;
    if (!this._nativeAssembler) return;

    for (var i = 0, len = this._vDatas.length; i < len; i++) {
      this._nativeAssembler.updateVerticesRange(i, 0, 0);

      this._nativeAssembler.updateIndicesRange(i, 0, 0);
    }
  };

  MeshBuffer.destroy = function () {
    this.reset();
  };
})();

},{}],50:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var RenderFlow = cc.RenderFlow;
cc.js.mixin(renderer.NodeProxy.prototype, {
  _ctor: function _ctor() {
    this._owner = null;
  },
  init: function init(owner) {
    this._owner = owner;
    var spaceInfo = owner._spaceInfo;
    this._owner._dirtyPtr = spaceInfo.dirty;
    this._dirtyPtr = spaceInfo.dirty;
    this._parentPtr = spaceInfo.parent;
    this._zOrderPtr = spaceInfo.zOrder;
    this._cullingMaskPtr = spaceInfo.cullingMask;
    this._opacityPtr = spaceInfo.opacity;
    this._is3DPtr = spaceInfo.is3D;
    this._skewPtr = spaceInfo.skew;
    this._isVisitingTraversal = false;
    owner._proxy = this;
    this.updateOpacity();
    this.update3DNode();
    this.updateZOrder();
    this.updateCullingMask();
    this.updateSkew();
    owner.on(cc.Node.EventType.SIBLING_ORDER_CHANGED, this.updateZOrder, this);
  },
  initNative: function initNative() {
    this.setName(this._owner._name);
    this.updateParent();
    this.updateOpacity();
    this.update3DNode();
    this.updateZOrder();
    this.updateSkew();
    this.updateCullingMask();
  },
  destroy: function destroy() {
    this.destroyImmediately();

    this._owner.off(cc.Node.EventType.SIBLING_ORDER_CHANGED, this.updateZOrder, this);

    this._owner._proxy = null;
    this._owner = null;
  },
  updateParent: function updateParent() {
    var parent = this._owner._parent;

    if (parent) {
      var parentSpaceInfo = parent._spaceInfo;
      this._parentPtr[0] = parentSpaceInfo.unitID;
      this._parentPtr[1] = parentSpaceInfo.index;
      var parentDirtyPtr = parentSpaceInfo.dirty;
      parentDirtyPtr[0] |= RenderFlow.FLAG_REORDER_CHILDREN;
      this._dirtyPtr[0] |= RenderFlow.FLAG_OPACITY;
    } else {
      this._parentPtr[0] = 0xffffffff;
      this._parentPtr[1] = 0xffffffff;
    }

    this.notifyUpdateParent();
  },
  updateZOrder: function updateZOrder() {
    this._zOrderPtr[0] = this._owner._localZOrder;
    var parent = this._owner._parent;

    if (parent && parent._proxy) {
      parent._proxy._dirtyPtr[0] |= RenderFlow.FLAG_REORDER_CHILDREN;
    }
  },
  updateCullingMask: function updateCullingMask() {
    this._cullingMaskPtr[0] = this._owner._cullingMask;
  },
  updateOpacity: function updateOpacity() {
    this._opacityPtr[0] = this._owner.opacity;
    this._dirtyPtr[0] |= RenderFlow.FLAG_OPACITY;
  },
  update3DNode: function update3DNode() {
    this._is3DPtr[0] = this._owner.is3DNode ? 0x1 : 0x0;
    this._dirtyPtr[0] |= RenderFlow.FLAG_LOCAL_TRANSFORM;
  },
  updateSkew: function updateSkew() {
    var skewPtr = this._skewPtr;
    var owner = this._owner;
    var skx = owner._skewX;
    var sky = owner._skewY;
    skewPtr[0] = skx;
    skewPtr[1] = sky;

    if (!this._isVisitingTraversal && (skx !== 0 || sky !== 0)) {
      this.switchTraverseToVisit();
      this._isVisitingTraversal = true;
    }
  }
});

},{}],51:[function(require,module,exports){
/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var RenderFlow = cc.RenderFlow;
var LOCAL_TRANSFORM = RenderFlow.FLAG_LOCAL_TRANSFORM;
var COLOR = RenderFlow.FLAG_COLOR;
var UPDATE_RENDER_DATA = RenderFlow.FLAG_UPDATE_RENDER_DATA;
var POSITION_ON = 1 << 0;

cc.Node.prototype.setLocalDirty = function (flag) {
  this._localMatDirty |= flag;
  this._worldMatDirty = true;
  this._dirtyPtr[0] |= RenderFlow.FLAG_TRANSFORM;
};

cc.js.getset(cc.Node.prototype, "_renderFlag", function () {
  return this._dirtyPtr[0];
}, function (flag) {
  this._dirtyPtr[0] = flag;

  if (flag & UPDATE_RENDER_DATA || flag & COLOR) {
    cc.RenderFlow.register(this);
  }
});

cc.PrivateNode.prototype._posDirty = function (sendEvent) {
  var parent = this.parent;

  if (parent) {
    // Position correction for transform calculation
    this._trs[0] = this._originPos.x - (parent._anchorPoint.x - 0.5) * parent._contentSize.width;
    this._trs[1] = this._originPos.y - (parent._anchorPoint.y - 0.5) * parent._contentSize.height;
  }

  this.setLocalDirty(cc.Node._LocalDirtyFlag.POSITION);

  if (sendEvent === true && this._eventMask & POSITION_ON) {
    this.emit(cc.Node.EventType.POSITION_CHANGED);
  }
};

},{}],52:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
(function () {
  if (!cc.QuadBuffer) return;
  var QuadBuffer = cc.QuadBuffer.prototype;

  QuadBuffer._fillQuadBuffer = function () {
    var count = this._initIDataCount / 6;
    var buffer = this._iData;

    for (var i = 0, idx = 0; i < count; i++) {
      var vertextID = i * 4;
      buffer[idx++] = vertextID;
      buffer[idx++] = vertextID + 1;
      buffer[idx++] = vertextID + 2;
      buffer[idx++] = vertextID + 1;
      buffer[idx++] = vertextID + 3;
      buffer[idx++] = vertextID + 2;
    }
  };

  QuadBuffer._reallocBuffer = function () {
    this._reallocVData(true);

    this._reallocIData();

    this._fillQuadBuffer();

    this._updateVIDatas();
  };

  QuadBuffer.uploadData = function () {};

  QuadBuffer.switchBuffer = function () {
    cc.MeshBuffer.prototype.switchBuffer.call(this);
  };
})();

},{}],53:[function(require,module,exports){
"use strict";

var proto = cc.RenderData.prototype;

cc.RenderData.prototype.init = function (assembler) {
  this._renderDataList = new renderer.RenderDataList();
  assembler.setRenderDataList(this._renderDataList);
  this._nativeAssembler = assembler;
};

var originClear = proto.clear;

proto.clear = function () {
  originClear.call(this);

  this._renderDataList.clear();
};

var originUpdateMesh = proto.updateMesh;

proto.updateMesh = function (meshIndex, vertices, indices) {
  originUpdateMesh.call(this, meshIndex, vertices, indices);

  if (vertices && indices) {
    this._renderDataList.updateMesh(meshIndex, vertices, indices);
  }
};

proto.updateMeshRange = function (verticesCount, indicesCount) {
  this._nativeAssembler.updateVerticesRange(0, 0, verticesCount);

  this._nativeAssembler.updateIndicesRange(0, 0, indicesCount);
};

},{}],54:[function(require,module,exports){
"use strict";

/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var RenderFlow = cc.RenderFlow;
RenderFlow.FLAG_REORDER_CHILDREN = 1 << 29;
RenderFlow.FLAG_WORLD_TRANSFORM_CHANGED = 1 << 30;
RenderFlow.FLAG_OPACITY_CHANGED = 1 << 31;
var _dirtyTargets = [];
var _dirtyWaiting = [];
var _rendering = false;
var director = cc.director;

RenderFlow.render = function (scene, dt) {
  var camera = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  _rendering = true;
  RenderFlow.validateRenderers();

  for (var i = 0, l = _dirtyTargets.length; i < l; i++) {
    var node = _dirtyTargets[i];
    node._inJsbDirtyList = false;
    var comp = node._renderComponent;
    if (!comp) continue;
    var assembler = comp._assembler;
    if (!assembler) continue;
    var flag = node._dirtyPtr[0];

    if (flag & RenderFlow.FLAG_UPDATE_RENDER_DATA) {
      node._dirtyPtr[0] &= ~RenderFlow.FLAG_UPDATE_RENDER_DATA;
      assembler._updateRenderData && assembler._updateRenderData();
    }

    if (flag & RenderFlow.FLAG_COLOR) {
      node._dirtyPtr[0] &= ~RenderFlow.FLAG_COLOR;
      comp._updateColor && comp._updateColor();
    }
  }

  _dirtyTargets.length = 0;
  dt = dt || 0;

  this._nativeFlow.render(scene._proxy, dt, camera);

  _dirtyTargets = _dirtyWaiting.slice(0);
  _dirtyWaiting.length = 0;
  _rendering = false;
};

RenderFlow.renderCamera = function (camera, scene) {
  RenderFlow.render(scene, 0, camera);
};

RenderFlow.init = function (nativeFlow) {
  cc.EventTarget.call(this);
  this._nativeFlow = nativeFlow;
};

RenderFlow.register = function (target) {
  if (target._inJsbDirtyList) return;

  if (_rendering) {
    _dirtyWaiting.push(target);
  } else {
    _dirtyTargets.push(target);
  }

  target._inJsbDirtyList = true;
};

},{}]},{},[27]);

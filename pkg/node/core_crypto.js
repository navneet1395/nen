/* @ts-self-types="./core_crypto.d.ts" */

class NenEncapsulation {
    static __wrap(ptr) {
        const obj = Object.create(NenEncapsulation.prototype);
        obj.__wbg_ptr = ptr;
        NenEncapsulationFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NenEncapsulationFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nenencapsulation_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get ciphertext() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.nenencapsulation_ciphertext(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get shared_secret() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.nenencapsulation_shared_secret(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
if (Symbol.dispose) NenEncapsulation.prototype[Symbol.dispose] = NenEncapsulation.prototype.free;
exports.NenEncapsulation = NenEncapsulation;

class NenKeypair {
    static __wrap(ptr) {
        const obj = Object.create(NenKeypair.prototype);
        obj.__wbg_ptr = ptr;
        NenKeypairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NenKeypairFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nenkeypair_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get public_key() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.nenkeypair_public_key(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get secret_key() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.nenkeypair_secret_key(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
if (Symbol.dispose) NenKeypair.prototype[Symbol.dispose] = NenKeypair.prototype.free;
exports.NenKeypair = NenKeypair;

class NenSigningKeypair {
    static __wrap(ptr) {
        const obj = Object.create(NenSigningKeypair.prototype);
        obj.__wbg_ptr = ptr;
        NenSigningKeypairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NenSigningKeypairFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nensigningkeypair_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    get public_key() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_nensigningkeypair_public_key(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get secret_key() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_nensigningkeypair_secret_key(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {Uint8Array} arg0
     */
    set public_key(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_nensigningkeypair_public_key(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Uint8Array} arg0
     */
    set secret_key(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_nensigningkeypair_secret_key(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) NenSigningKeypair.prototype[Symbol.dispose] = NenSigningKeypair.prototype.free;
exports.NenSigningKeypair = NenSigningKeypair;

/**
 * @param {Uint8Array} ciphertext
 * @param {Uint8Array} secret_key
 * @returns {Uint8Array}
 */
function nen_decapsulate(ciphertext, secret_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(ciphertext, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(secret_key, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.nen_decapsulate(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_decapsulate = nen_decapsulate;

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} nonce
 * @param {Uint8Array} ciphertext
 * @returns {Uint8Array}
 */
function nen_decrypt(key, nonce, ciphertext) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(nonce, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(ciphertext, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.nen_decrypt(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_decrypt = nen_decrypt;

/**
 * @param {Uint8Array} public_key
 * @returns {NenEncapsulation}
 */
function nen_encapsulate(public_key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(public_key, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        wasm.nen_encapsulate(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return NenEncapsulation.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_encapsulate = nen_encapsulate;

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} nonce
 * @param {Uint8Array} plaintext
 * @returns {Uint8Array}
 */
function nen_encrypt(key, nonce, plaintext) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(nonce, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(plaintext, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.nen_encrypt(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_encrypt = nen_encrypt;

/**
 * @param {string} encoded
 * @returns {Uint8Array}
 */
function nen_from_base64(encoded) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(encoded, wasm.__wbindgen_export3, wasm.__wbindgen_export4);
        const len0 = WASM_VECTOR_LEN;
        wasm.nen_from_base64(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_from_base64 = nen_from_base64;

/**
 * @returns {NenKeypair}
 */
function nen_generate_keypair() {
    const ret = wasm.nen_generate_keypair();
    return NenKeypair.__wrap(ret);
}
exports.nen_generate_keypair = nen_generate_keypair;

/**
 * @returns {Uint8Array}
 */
function nen_generate_nonce() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.nen_generate_nonce(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_generate_nonce = nen_generate_nonce;

/**
 * @returns {NenSigningKeypair}
 */
function nen_generate_signing_keypair() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.nen_generate_signing_keypair(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return NenSigningKeypair.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_generate_signing_keypair = nen_generate_signing_keypair;

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} message
 * @returns {Uint8Array}
 */
function nen_hmac_sign(key, message) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.nen_hmac_sign(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_hmac_sign = nen_hmac_sign;

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} message
 * @param {Uint8Array} signature
 * @returns {boolean}
 */
function nen_hmac_verify(key, message, signature) {
    const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_export3);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(signature, wasm.__wbindgen_export3);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.nen_hmac_verify(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
}
exports.nen_hmac_verify = nen_hmac_verify;

/**
 * @param {Uint8Array} secret_key
 * @param {Uint8Array} message
 * @returns {Uint8Array}
 */
function nen_sign(secret_key, message) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(secret_key, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.nen_sign(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
exports.nen_sign = nen_sign;

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function nen_to_base64(bytes) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        wasm.nen_to_base64(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
    }
}
exports.nen_to_base64 = nen_to_base64;

/**
 * @param {Uint8Array} public_key
 * @param {Uint8Array} message
 * @param {Uint8Array} signature_bytes
 * @returns {boolean}
 */
function nen_verify_signature(public_key, message, signature_bytes) {
    const ptr0 = passArray8ToWasm0(public_key, wasm.__wbindgen_export3);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_export3);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(signature_bytes, wasm.__wbindgen_export3);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.nen_verify_signature(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
}
exports.nen_verify_signature = nen_verify_signature;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_function_754e9f305ff6029e: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_56732c2bc353f41d: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_c236cabd84a4d769: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_67b456be8673d3d7: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_throw_1506f2235d1bdba0: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_9c758de292015997: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = getObject(arg0).crypto;
            return addHeapObject(ret);
        },
        __wbg_getRandomValues_76dfc69825c9c552: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).getRandomValues(getObject(arg1));
        }, arguments); },
        __wbg_length_4a591ecaa01354d9: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = getObject(arg0).msCrypto;
            return addHeapObject(ret);
        },
        __wbg_new_with_length_36a4998e27b014c5: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = getObject(arg0).node;
            return addHeapObject(ret);
        },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = getObject(arg0).process;
            return addHeapObject(ret);
        },
        __wbg_prototypesetcall_3249fc62a0fafa30: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).randomFillSync(takeObject(arg1));
        }, arguments); },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return addHeapObject(ret);
        }, arguments); },
        __wbg_static_accessor_GLOBAL_9d53f2689e622ca1: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_a1a35cec07001a8a: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_4c59f6c7ea29a144: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_e70ae9f2eb052253: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_subarray_4aa221f6a4f5ab22: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = getObject(arg0).versions;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./core_crypto_bg.js": import0,
    };
}

const NenEncapsulationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nenencapsulation_free(ptr, 1));
const NenKeypairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nenkeypair_free(ptr, 1));
const NenSigningKeypairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nensigningkeypair_free(ptr, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

const wasmPath = `${__dirname}/core_crypto_bg.wasm`;
const wasmBytes = require('fs').readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
let wasm = wasmInstance.exports;

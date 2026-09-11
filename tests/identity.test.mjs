/*
 * Credential validation tests.
 *
 * These exist because three separate PIN rules had drifted apart. Registration
 * rejected weak PINs; `changePin` and `setSupervisorPin` checked only that the
 * input was four to six digits. The consequences were concrete: a worker forced to
 * pick a strong PIN could change it to 0000 immediately afterwards, and the
 * supervisor PIN — the one credential guarding the compliance dashboard, the hazard
 * board, chain integrity and the statutory export — could be 1234. The weakest rule
 * was protecting the most sensitive thing.
 *
 * The phone tests cover a separate hole with the same shape: `normalisePhone` ended
 * in `.slice(-10)`, so ANY long run of digits was truncated into a valid-looking
 * ten-digit number instead of being rejected. Fourteen nines became 9999999999 and
 * passed every downstream check.
 *
 * Only the pure functions are exercised. login(), changePin() and
 * setSupervisorPin() touch IndexedDB and localStorage, so they are out of reach of
 * a plain node test — but all three now route their validation through
 * validatePin(), which is tested here.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  validatePin,
  isWeakPin,
  validateRegistration,
  normalisePhone,
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
} from '../src/lib/identity.js'

/* ------------------------------------------------------------ PIN rules */

describe('isWeakPin', () => {
  test('a single repeated digit is weak at every length', () => {
    for (const pin of ['0000', '1111', '9999', '00000', '111111', '888888']) {
      assert.equal(isWeakPin(pin), true, `${pin} should be weak`)
    }
  })

  test('consecutive runs are weak in both directions', () => {
    // The old blocklist named four literals and missed 2345, 6789, 987654 and
    // every other run. These are derived rather than listed.
    for (const pin of ['1234', '2345', '3456', '6789', '4321', '9876', '123456', '987654', '54321']) {
      assert.equal(isWeakPin(pin), true, `${pin} should be weak`)
    }
  })

  test('a repeated pair is weak', () => {
    for (const pin of ['1212', '2727', '121212', '454545']) {
      assert.equal(isWeakPin(pin), true, `${pin} should be weak`)
    }
  })

  test('an ordinary PIN is not weak', () => {
    for (const pin of ['1937', '8264', '5091', '204815', '73629', '1357']) {
      assert.equal(isWeakPin(pin), false, `${pin} should be allowed`)
    }
  })

  test('empty and junk count as weak rather than throwing', () => {
    for (const pin of ['', null, undefined, {}, []]) {
      assert.equal(isWeakPin(pin), true)
    }
  })
})

describe('validatePin', () => {
  test('a good PIN passes', () => {
    assert.deepEqual(validatePin('8264'), [])
    assert.deepEqual(validatePin('204815'), [])
  })

  test('length is enforced at both ends', () => {
    assert.deepEqual(validatePin('123'), ['PIN_FORMAT'])
    assert.deepEqual(validatePin('1234567'), ['PIN_FORMAT'])
    assert.equal(PIN_MIN_LENGTH, 4)
    assert.equal(PIN_MAX_LENGTH, 6)
  })

  test('non-digits are rejected', () => {
    for (const pin of ['12a4', ' 1234', '12 34', '١٢٣٤', '12.4', '']) {
      assert.ok(validatePin(pin).includes('PIN_FORMAT'), `${JSON.stringify(pin)} should fail format`)
    }
  })

  test('a badly formatted PIN reports format only, not simplicity too', () => {
    // Reporting both at once produced two contradictory messages for one field.
    assert.deepEqual(validatePin('11'), ['PIN_FORMAT'])
  })

  test('weak PINs are rejected with their own code', () => {
    assert.deepEqual(validatePin('0000'), ['PIN_TOO_SIMPLE'])
    assert.deepEqual(validatePin('1234'), ['PIN_TOO_SIMPLE'])
  })

  test('confirmation is only checked when supplied', () => {
    assert.deepEqual(validatePin('8264'), [], 'no confirm argument means no mismatch check')
    assert.deepEqual(validatePin('8264', { confirm: '8264' }), [])
    assert.deepEqual(validatePin('8264', { confirm: '8265' }), ['PIN_MISMATCH'])
    assert.deepEqual(validatePin('8264', { confirm: '' }), ['PIN_MISMATCH'])
  })

  test('the codes a caller can receive are stable', () => {
    // The UI maps these to translated strings, so a renamed code shows a raw key.
    const all = new Set([
      ...validatePin('1'),
      ...validatePin('0000'),
      ...validatePin('8264', { confirm: 'x' }),
    ])
    for (const code of all) {
      assert.ok(
        ['PIN_FORMAT', 'PIN_TOO_SIMPLE', 'PIN_MISMATCH'].includes(code),
        `unexpected code ${code}`,
      )
    }
  })
})

/* -------------------------------------------------------------- phone */

describe('normalisePhone', () => {
  test('a plain ten-digit number is unchanged', () => {
    assert.equal(normalisePhone('9876543210'), '9876543210')
  })

  test('formatting is stripped', () => {
    assert.equal(normalisePhone('98765 43210'), '9876543210')
    assert.equal(normalisePhone('98765-43210'), '9876543210')
    assert.equal(normalisePhone('(98765) 43210'), '9876543210')
  })

  test('an Indian country code or trunk prefix is removed', () => {
    assert.equal(normalisePhone('+91 98765 43210'), '9876543210')
    assert.equal(normalisePhone('919876543210'), '9876543210')
    assert.equal(normalisePhone('09876543210'), '9876543210')
    assert.equal(normalisePhone('+091 9876543210'), '9876543210')
  })

  test('an overlong number is NOT truncated into validity', () => {
    /*
     * The whole point. `.slice(-10)` turned any long digit run into a plausible
     * number, so a user mashing the keypad registered successfully. These must come
     * back at their real length so validation can reject them.
     */
    for (const input of ['99999999999999', '12345678901234567890', '9876543210999']) {
      const out = normalisePhone(input)
      assert.notEqual(out.length, 10, `${input} must not normalise to ten digits, got ${out}`)
    }
  })

  test('a short number stays short', () => {
    assert.equal(normalisePhone('12345'), '12345')
  })

  test('empty input yields empty, not a partial number', () => {
    for (const input of ['', null, undefined, 'abcd', '   ']) {
      assert.equal(normalisePhone(input), '')
    }
  })
})

/* ------------------------------------------------------- registration */

describe('validateRegistration', () => {
  const ok = { name: 'Rakesh Kumar', phone: '9876543210', pin: '8264', pinConfirm: '8264' }

  test('a complete valid registration passes', () => {
    assert.deepEqual(validateRegistration(ok), [])
  })

  test('the phone is optional', () => {
    assert.deepEqual(validateRegistration({ ...ok, phone: '' }), [])
    assert.deepEqual(validateRegistration({ ...ok, phone: null }), [])
  })

  test('a keypad-mash phone number is rejected rather than truncated', () => {
    // The reported symptom: any number was accepted.
    for (const phone of ['99999999999999', '1111111111', '0000000000', '1234567890', '123']) {
      assert.ok(
        validateRegistration({ ...ok, phone }).includes('PHONE_INVALID'),
        `${phone} should be rejected`,
      )
    }
  })

  test('a real mobile prefix is required', () => {
    // Indian mobiles start 6-9. Landline-style and all-zero numbers passed the
    // old length-only check.
    for (const phone of ['5876543210', '1876543210', '0876543210']) {
      assert.ok(validateRegistration({ ...ok, phone }).includes('PHONE_INVALID'), `${phone}`)
    }
    for (const phone of ['6876543210', '7876543210', '8876543210', '9876543210']) {
      assert.deepEqual(validateRegistration({ ...ok, phone }), [], `${phone} should be accepted`)
    }
  })

  test('a name of pure digits is rejected', () => {
    // How "1234" became a worker record.
    for (const name of ['1234', '99999', '...', '---']) {
      assert.ok(validateRegistration({ ...ok, name }).includes('NAME_INVALID'), `${name}`)
    }
  })

  test('non-Latin names are accepted', () => {
    // Six languages ship. A Latin-only name check would lock out most users.
    for (const name of ['राकेश कुमार', 'ᱨᱟᱠᱮᱥ', 'রাকেশ', 'ରାକେଶ', 'راکیش']) {
      assert.deepEqual(validateRegistration({ ...ok, name }), [], `${name} should be accepted`)
    }
  })

  test('name length is bounded at both ends', () => {
    assert.ok(validateRegistration({ ...ok, name: 'R' }).includes('NAME_TOO_SHORT'))
    assert.ok(validateRegistration({ ...ok, name: 'R'.repeat(61) }).includes('NAME_TOO_LONG'))
  })

  test('registration enforces the same PIN rule as everywhere else', () => {
    // The regression this guards: registration and changePin must not diverge.
    assert.ok(validateRegistration({ ...ok, pin: '0000', pinConfirm: '0000' }).includes('PIN_TOO_SIMPLE'))
    assert.ok(validateRegistration({ ...ok, pin: '1234', pinConfirm: '1234' }).includes('PIN_TOO_SIMPLE'))
    assert.ok(validateRegistration({ ...ok, pin: '12', pinConfirm: '12' }).includes('PIN_FORMAT'))
    assert.ok(validateRegistration({ ...ok, pinConfirm: '9999' }).includes('PIN_MISMATCH'))
  })

  test('codes are deduplicated', () => {
    const codes = validateRegistration({ name: '', phone: 'x', pin: '', pinConfirm: '' })
    assert.equal(codes.length, new Set(codes).size)
  })

  test('junk input yields codes rather than throwing', () => {
    for (const input of [{}, { name: null, pin: null }, { name: 42, pin: 42 }]) {
      const codes = validateRegistration(input)
      assert.ok(Array.isArray(codes) && codes.length > 0)
    }
  })
})

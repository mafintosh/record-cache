const test = require('brittle')
const recordCache = require('./')

test('add and get', function (t) {
  const rc = recordCache()
  rc.add('hello', 'world')
  t.alike(rc.get('hello'), ['world'])
})

test('add and get buffer', function (t) {
  const rc = recordCache()
  rc.add('hello', Buffer.from('world'))
  t.alike(rc.get('hello'), [Buffer.from('world')])
})

test('add and get (more than one)', function (t) {
  const rc = recordCache()
  rc.add('hello', 'world')
  rc.add('hello', 'verden')
  rc.add('hello', 'welt')
  t.alike(rc.get('hello').sort(), ['verden', 'welt', 'world'])

  const list = rc.get('hello', 2)
  t.ok(list[0] !== list[1])
  t.ok(['verden', 'welt', 'world'].includes(list[0]))
  t.ok(['verden', 'welt', 'world'].includes(list[1]))
})

test('get is randomised', function (t) {
  const rc = recordCache()

  rc.add('hello', 'a')
  rc.add('hello', 'b')
  rc.add('hello', 'c')

  const map = {}

  for (let i = 0; i < 1000; i++) {
    map[rc.get('hello', 2).join('')] = true
  }

  t.alike(map, { ab: true, ba: true, cb: true, bc: true, ac: true, ca: true })
})

test('get capped', function (t) {
  const rc = recordCache({ maxSize: 10 })

  for (let i = 0; i < 50; i++) {
    rc.add('hello', '' + i)
  }

  t.ok(rc.get('hello').length <= 20)
  t.ok(rc.size <= 20)
  t.absent(rc.get('hello').includes('0'))
  t.absent(rc.get('hello').includes('29'))
})

test('get capped with many record sets', function (t) {
  const rc = recordCache({ maxSize: 10 })

  for (let i = 0; i < 50; i++) {
    rc.add('' + i, 'hello')
  }

  t.ok(rc.size <= 20)
  t.alike(rc.get('0'), [])
  t.alike(rc.get('29'), [])
  t.alike(rc.get('49'), ['hello'])
})

test('many updates is fine when capped', function (t) {
  const rc = recordCache({ maxSize: 10 })

  for (let i = 0; i < 10; i++) {
    rc.add('hello', '' + i)
  }
  for (let j = 0; j < 100; j++) {
    rc.add('hello', '9')
  }

  t.alike(rc.get('hello').sort().join(''), '0123456789')
})

test('remove', function (t) {
  const rc = recordCache()

  t.alike(rc.get('hello'), [])
  rc.remove('hello', 'world')
  t.alike(rc.get('hello'), [])
  rc.add('hello', 'world')
  t.alike(rc.get('hello'), ['world'])
  rc.remove('hello', 'world')
  t.alike(rc.get('hello'), [])
})

test('remove with other value', function (t) {
  const rc = recordCache()

  rc.add('hello', 'hi')
  t.alike(rc.get('hello'), ['hi'])
  rc.remove('hello', 'world')
  t.alike(rc.get('hello'), ['hi'])
  rc.add('hello', 'world')
  t.alike(rc.get('hello').sort(), ['hi', 'world'])
  rc.remove('hello', 'world')
  t.alike(rc.get('hello'), ['hi'])
})

test('clear', function (t) {
  const rc = recordCache()

  rc.clear()
  t.alike(rc.get('hello'), [])
  rc.add('hello', 'a')
  rc.add('hello', 'b')
  rc.add('foo', 'bar')
  t.alike(rc.get('hello').sort(), ['a', 'b'])
  rc.clear()
  t.alike(rc.get('hello'), [])
  t.alike(rc.get('foo'), [])
})

test('maxAge', async function (t) {
  const rc = recordCache({ maxAge: 20 })
  t.plan(2)

  rc.add('hello', 'world')
  rc.add('hello', 'verden')
  setTimeout(function () {
    t.alike(rc.get('hello').sort(), ['verden', 'world'])
    setTimeout(function () {
      t.alike(rc.get('hello'), [])
      rc.destroy()
    }, 35)
  }, 5)
})

test('maxAge but one value is staying alive', function (t) {
  const rc = recordCache({ maxAge: 20 })
  t.plan(2)

  rc.add('hello', 'world')
  rc.add('hello', 'verden')
  const interval = setInterval(function () {
    rc.add('hello', 'verden')
  }, 5)
  setTimeout(function () {
    t.alike(rc.get('hello').sort(), ['verden', 'world'])
    setTimeout(function () {
      clearInterval(interval)
      t.alike(rc.get('hello'), ['verden'])
      rc.destroy()
    }, 35)
  }, 5)
})

test('add dedups buffers', function (t) {
  const rc = recordCache()

  rc.add('hello', Buffer.from('world'))
  rc.add('hello', Buffer.from('world'))

  t.alike(rc.get('hello'), [Buffer.from('world')])
})

test('add and remove buffer', function (t) {
  const rc = recordCache()

  rc.add('hello', Buffer.from('world'))
  rc.remove('hello', Buffer.from('world'))

  t.alike(rc.get('hello'), [])
})

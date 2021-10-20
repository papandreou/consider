const expect = require('unexpected').clone().use(require('./lib/consider'));

expect.addAssertion(
  '<any> when delayed a bit <assertion>',
  function (expect, ...rest) {
    return expect.promise(function (run) {
      setTimeout(
        run(function () {
          return expect(...rest);
        }),
        10
      );
    });
  }
);

describe('consider', () => {
  it.skip('should fail', () => {
    expect(1, 'to equal', 2);
    expect('abc', 'to equal', 'abc');
    expect(2, 'to equal', 3);
  });

  it('should succeed', () => {
    expect(1, 'to equal', 1);
    expect('abc', 'to equal', 'abc');
    expect(2, 'to equal', 2);
  });

  it.skip('should work with async assertions', async () => {
    expect('abc', 'when delayed a bit to equal', 'abe');
    const captures = await expect('abc', 'when delayed a bit to match', /^(a)/);
    expect(captures, 'to satisfy', { index: 0 });
  });
});

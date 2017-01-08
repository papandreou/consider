var consider = require('./lib/consider');

consider.addAssertion('<any> when delayed a bit <assertion>', function (expect, ...rest) {
    return expect.promise(function (run) {
        setTimeout(run(function () {
            return expect(...rest);
        }), 10);
    });
});

describe('consider', () => {
    it('should fail', () => {
        consider(1, 'to equal', 2);
        consider('abc', 'to equal', 'abc');
        consider(2, 'to equal', 3);
    });

    it('should succeed', () => {
        consider(1, 'to equal', 1);
        consider('abc', 'to equal', 'abc');
        consider(2, 'to equal', 2);
    });

    it('should work with async assertions', async () => {
        consider('abc', 'when delayed a bit to equal', 'abe');
        let captures = await consider('abc', 'when delayed a bit to match', /^(a)/);
        consider(captures, 'to satisfy', {index: 0});
    });
});

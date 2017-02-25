var createStandardErrorMessage = require('unexpected/lib/createStandardErrorMessage');
var executing = false;

module.exports = function consider(expect) {
    if (typeof afterEach !== 'function') {
        // No afterEach function is available, fall back to regular expect:
        return expect;
    }

    // Disable the footgun protection of our Unexpected clone:
    expect.notifyPendingPromise = function () {};

    let promisesForTheCurrentTest = [];
    afterEach(function () {
        let promises = promisesForTheCurrentTest;
        promisesForTheCurrentTest = [];
        if (promises.length > 0) {
            return expect.promise.settle(promises).then(() => {
                if (promises.some(promise => promise.isRejected())) {
                    try {
                        expect.fail(function (output) {
                            // Align with mocha's test output:
                            output.sp(5).block(function (output) {
                                promises.forEach((promise, i) => {
                                    if (i > 0) {
                                        output.nl();
                                    }
                                    // Reporting logic mostly copied from expect.it:
                                    if (promise.isRejected()) {
                                        output.error('⨯ ').block(promise.reason().getErrorMessage(output));
                                    } else {
                                        output.success('✓ ').block(function (output) {
                                            var subject = promise.expectation[0];
                                            var subjectOutput = function (output) {
                                                output.appendInspected(subject);
                                            };
                                            var args = promise.expectation.slice(2);
                                            var argsOutput = args.map(function (arg) {
                                                return function (output) {
                                                    output.appendInspected(arg);
                                                };
                                            });
                                            var testDescription = promise.expectation[1];
                                            createStandardErrorMessage(output, subjectOutput, testDescription, argsOutput, {
                                                subject: subject
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    } catch (e) {
                        this.test.error(e);
                    }
                }
            });
        }
    });

    let consider = function consider(...args) {
        let returnValue;
        if (executing) {
            return expect(...args);
        } else {
            executing = true;

            try {
                returnValue = expect(...args);
            } catch (e) {
                // Anti-oathbreak:
                returnValue = expect.promise.reject(e);
            } finally {
                executing = false;
            }
            // Prevent "unhandled rejection" errors from being thrown.
            // We'll settle the score in the afterEach block:
            returnValue.then(undefined, function () {});
            returnValue.expectation = [...args];
            promisesForTheCurrentTest.push(returnValue);
            return returnValue;
        }
    };
    // Expose a consider.use etc.
    Object.keys(expect).forEach(key => {
        if (typeof expect[key] === 'function' && key !== 'promise') {
            consider[key] = expect[key].bind(expect);
        } else {
            consider[key] = expect[key];
        }
    });

    return consider;
};

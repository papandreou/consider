const createStandardErrorMessage = require('unexpected/lib/createStandardErrorMessage');

module.exports = {
  name: 'consider',
  version: require('../package.json').version,
  installInto: function (expect) {
    let executing = false;

    let promisesForTheCurrentTest = [];
    let afterEachHookRegistered = false;
    function registerAfterEachHook() {
      if (!afterEachHookRegistered && typeof afterEach === 'function') {
        // Disable the footgun protection of our Unexpected clone:
        expect.notifyPendingPromise = function () {};

        afterEachHookRegistered = true;
        afterEach(function () {
          const promises = promisesForTheCurrentTest;
          promisesForTheCurrentTest = [];
          if (promises.length > 0) {
            return expect.promise.settle(promises).then(() => {
              if (promises.some((promise) => promise.isRejected())) {
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
                          output
                            .error('⨯ ')
                            .block(promise.reason().getErrorMessage(output));
                        } else {
                          output.success('✓ ').block(function (output) {
                            const subject = promise.expectation[0];
                            const subjectOutput = function (output) {
                              output.appendInspected(subject);
                            };
                            const args = promise.expectation.slice(2);
                            const argsOutput = args.map(function (arg) {
                              return function (output) {
                                output.appendInspected(arg);
                              };
                            });
                            const testDescription = promise.expectation[1];
                            createStandardErrorMessage(
                              output,
                              subjectOutput,
                              testDescription,
                              argsOutput,
                              {
                                subject,
                              }
                            );
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
      }
    }

    // When running in jasmine/node.js, afterEach is available immediately,
    // but doesn't work within the it block. Register the hook immediately:
    registerAfterEachHook();

    expect.hook(function (next) {
      return function consider(context, args) {
        registerAfterEachHook();
        if (!afterEachHookRegistered || executing) {
          return next(context, args);
        }

        let returnValue;
        executing = true;

        try {
          returnValue = next(context, args);
        } catch (e) {
          // Anti-oathbreak:
          executing = false;
          returnValue = expect.promise.reject(e);
        }
        // Prevent "unhandled rejection" errors from being thrown.
        // We'll settle the score in the afterEach block:
        returnValue
          .then(undefined, function () {})
          .finally(() => (executing = false));
        returnValue.expectation = [...args];
        promisesForTheCurrentTest.push(returnValue);
        return returnValue;
      };
    });
  },
};

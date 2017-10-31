const _ = require('lodash');

const navigate = (browser, path, cb) => {
  const url = browser.launch_url + path;
  browser.url(url, ({error, value}) => {
    if (error) {
      console.error(value);
      process.exit(1);
    }
    console.log('navigated to ', url);
    cb();
  });
};

const TIMEOUT = 15000;


const asyncLoad = (browser, i, cb) => {
  if (i > 10) {
    return (null, new Error('Did not load list in time.'));
  }

  /* This is literally execing in the browser!
    - No libraries.
    - No typescript.
    - No sweet sweet ES2017.
    - Top-level function can't be fat arrow. (because `this`)
   */
  browser.execute(function () {
    const loadingStatus = document.getElementsByClassName('loading-box')[0].getAttribute('class');
    return loadingStatus.split(' ').map(css => css.split('__')[1]).filter(x => x)[0];
  }, ({value}) => {
    switch (value) {
      case 'loading':
        browser.pause(500);
        asyncLoad(browser, i+1, cb);
        return;
      case 'loaded':
        return cb(value);
      case 'errored':
        return cb(value, new Error('Error loading list'));
      default:
        return cb(value, new Error('Unknown error loading list.'));
    }
  });
};

const deleteExamples = (page, browser) => {
  const deleteExample = ids => {
    if (ids.length === 0) {
      return;
    }
    const selector = `#${ids[0]}`;
    const css = `${selector} li:last-child a`;
    browser.pause(100);
    // TODO: fail if all deletes fail
    browser.isVisible(selector, ({status}) => {
      if (status) {
        console.error('No delete dropdown for ', selector);
        return deleteExample(ids.slice(1));
      }
      page.click(selector)
        .waitForElementPresent(css, TIMEOUT)
        .click(css)
        .waitForElementPresent('@deleteModalConfirmButton', TIMEOUT)
        .click('@deleteModalConfirmButton')
        .waitForElementPresent('@CreateYAMLButton', TIMEOUT, () => {
          deleteExample(ids.slice(1));
        });
    });
  };

  asyncLoad(browser, 0, (value, error) => {
    if (error) {
      throw error;
    }

    browser.execute(function () {
      return Array.from(document.querySelectorAll('div.co-m-cog-wrapper')).map(d => d.getAttribute('id'));
    }, ({value}) => {
      deleteExample(value);
    });
  });
};

const createExamples = (page, browser) => {
  page
    .waitForElementPresent('@CreateYAMLButton', TIMEOUT)
    .click('@CreateYAMLButton')
    .waitForElementPresent('@saveYAMLButton', TIMEOUT)
    .click('@saveYAMLButton')
    .waitForElementPresent('@actionsDropdownButton', TIMEOUT, false, () => {
      console.log('Resource created');
      //with verify(), when an assertion fails, the test logs the failure and continues with other assertions.
      browser.verify.urlContains('/example');
    });
};

const crudTests_ = {};

const k8sObjs = [
  'pods',
  'networkpolicies',
  'services',
  'serviceaccounts',
  'secrets',
  'configmaps',
  'persistentvolumes',
  'ingresses',
  // Things that create the resources above will cause test flakes if we create/destroy them first.
  'jobs',
  'daemonsets',
  'deployments',
  'replicasets',
  'replicationcontrollers',
  'etcdclusters',
  'prometheuses',
  'persistentvolumeclaims',
  'resourcequotas',
  // 'namespaces', // TODO: (kans) special case. namespaces don't use the same UI for creation
  'statefulsets',
  'roles',
];

k8sObjs.forEach(resource => {
  crudTests_[`Delete ${resource}`] = browser => {
    const crudPage = browser.page.crudPage();
    navigate(browser, `/all-namespaces/${resource}?name=example`, () => deleteExamples(crudPage, browser));
  };
});

k8sObjs.forEach(resource => {
  crudTests_[`YAML - create ${resource}`] = browser => {
    const crudPage = browser.page.crudPage();
    navigate(browser, `/all-namespaces/${resource}`, () => createExamples(crudPage, browser));
  };
});

k8sObjs.forEach(resource => {
  crudTests_[`Delete (cleanup) ${resource}`] = browser => {
    if (resource === k8sObjs[0]) {
      console.log('Waiting for recently-created stuff to exist');
      browser.pause(10000);
    }
    const crudPage = browser.page.crudPage();
    navigate(browser, `/all-namespaces/${resource}?name=example`, () => deleteExamples(crudPage, browser));
  };
});

const logger = logs => {
  console.log('==== BEGIN BROWSER LOGS ====');
  _.each(logs, log => {
    const { level, message } = log;
    const messageStr = _.isArray(message) ? message.join(' ') : message;

    switch (level) {
      case 'DEBUG':
        console.log(level, messageStr);
        break;
      case 'SEVERE':
        console.warn(level, messageStr);
        break;
      case 'INFO':
      default:
        // eslint-disable-next-line no-console
        console.info(level, messageStr);
    }
  });
  console.log('==== END BROWSER LOGS ====');
};

crudTests_.after = browser => {
  browser.getLog('browser', logger);
  browser.end();
};

module.exports = crudTests_;

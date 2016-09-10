try {
  window['__REAL_REQUIRE__'] = require;
  window['__REAL_MODULE__'] = module;
  require = undefined;
  module = undefined;
} catch (e) {
  console.log('Controlled exception', e);
}
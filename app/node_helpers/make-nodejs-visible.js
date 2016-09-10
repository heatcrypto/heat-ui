try {
  require = window['__REAL_REQUIRE__'];
  module = window['__REAL_MODULE__'];
  window['__REAL_REQUIRE__'] = undefined;
  window['__REAL_MODULE__'] = undefined;
} catch (e) {
  console.log('Controlled exception', e);
}
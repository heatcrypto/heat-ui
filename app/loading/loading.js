(function (start) {
  var minDuration = 3000;
  function show() {
    angular.element(document).find('html').removeClass('loading');
  }
  document.addEventListener("DOMContentLoaded", function() {
    var now = Date.now();
    if ((now - start)>minDuration) {
      show();
    }
    else {
      setTimeout(show, minDuration-(now - start));
    }
  });
})(Date.now());


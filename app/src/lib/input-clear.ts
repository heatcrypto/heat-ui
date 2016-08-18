lompsa.Loader.directive('inputClear', () => {
  return {
    restrict: 'A',
    compile: function (element, attrs) {
      var color = attrs.inputClear;
      var action = attrs.ngModel + " = ''";
      element.after(
          '<md-button class="animate-show md-icon-button md-accent"' +
          'ng-show="' + attrs.ngModel + '" ng-click="' + action + '"' +
          'style="position: absolute; top: 0px; right: -2px; margin-right:0px;">' +
          '<md-icon style="color:black;font-size: 18px;" md-font-library="material-icons">close</md-icon>' +
          '</md-button>');
    }
  };
});
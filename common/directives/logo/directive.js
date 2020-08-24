/**
* @desc build html for to display an address
*
* @example
*
*      <rf-logo responsive="true" link="true"></rf-logo>
*
*      <rf-logo responsive="true"></rf-logo>
*
*      <rf-logo link="true"></rf-logo>
*
*      <rf-logo></rf-logo>
*
*/

app.directive('rfLogo', ['loginFactory', 'http', function (loginFactory, http) { // panel on top: zoom, undo/redo
   return {
      restrict: 'E',
      templateUrl: 'global/common/directives/logo/template.html',
      scope: {
         responsive: '=?',
         link: '=?'
      },
      link: function ($scope, elem, attr) {

         var appName = loginFactory.getAppName() || 'rf-app-cad';

         var urls = loginFactory.getAppUrls(appName);
         if (urls.main) $scope.mainUrl = urls.main;

         var logos = {};

         if (loginFactory.getAppLogos(appName)) {
            logos = loginFactory.getAppLogos(appName);
         } else {
            http.post('get-app-logos', function (logos) {
               logos = logos || {};
            });
         }



         if (!logos.xs) var xs = logos.sm || logos.md || logos.lg || '/common/img/icon-lg.svg';
         if (!logos.sm) var sm = logos.md || logos.lg || logos.xs || '/common/img/logo-xs.svg';
         if (!logos.md) var md = logos.lg || logos.sm || logos.xs || '/common/img/logo-sm.svg';
         if (!logos.lg) var lg = logos.md || logos.sm || logos.xs || '/common/img/logo-lg.svg';

         logos.xs = xs;
         logos.sm = sm;
         logos.md = md;
         logos.lg = lg;

         $scope.logos = logos;
      }
   };
}]);

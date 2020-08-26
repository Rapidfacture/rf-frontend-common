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

         var files = {};

         if (loginFactory.getAppLogos(appName)) {
            files = loginFactory.getAppLogos(appName) || {};
         } else {
            http.post('get-app-logos', function (files) {
               files = files || {};
            });
         }

         var logos = {};

         if (files.lg && files.lg.fileId && files.lg.extension) logos.lg = '/static/public-files/' + files.lg.fileId + '.' + files.lg.extension;
         if (files.md && files.md.fileId && files.md.extension) logos.md = '/static/public-files/' + files.md.fileId + '.' + files.md.extension;
         if (files.sm && files.sm.fileId && files.sm.extension) logos.sm = '/static/public-files/' + files.sm.fileId + '.' + files.sm.extension;
         if (files.xs && files.xs.fileId && files.xs.extension) logos.xs = '/static/public-files/' + files.xs.fileId + '.' + files.xs.extension;

         if (!logos.xs) var xs = logos.xs || logos.sm || logos.md || logos.lg || '/common/img/icon-lg.svg';
         if (!logos.sm) var sm = logos.sm || logos.md || logos.lg || logos.xs || '/common/img/logo-xs.svg';
         if (!logos.md) var md = logos.lg || logos.sm || logos.xs || '/common/img/logo-sm.svg';
         if (!logos.lg) var lg = logos.md || logos.sm || logos.xs || '/common/img/logo-lg.svg';

         logos.xs = logos.xs || xs;
         logos.sm = logos.sm || sm;
         logos.md = logos.md || md;
         logos.lg = logos.lg || lg;

         $scope.logos = logos;
      }
   };
}]);

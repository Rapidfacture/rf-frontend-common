/**
 * @desc dialog with infos about program, version, license, dependencies
 *
 * @version 0.0.3
 *
 */

app.directive('rfDialogAbout', ['config', '$http', function (config, $http) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/dialog/about/template.html',
      scope: { dialog: '=', lang: '=' },
      link: function ($scope, elem, attr, ctrl) {
         $scope.dialog.size = 'medium';

         $scope.app = config.app;

         $scope.year = new Date().getFullYear();
      }
   };
}]);

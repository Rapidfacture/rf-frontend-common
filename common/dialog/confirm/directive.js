app.directive('rfDialogConfirm', [function () {
   return {
      restrict: 'E',
      templateUrl: 'global/common/dialog/confirm/template.html',
      scope: { dialog: '=', lang: '=' },
      link: function ($scope, elem, attr, ctrl) {
         $scope.dialog.onSuccess = $scope.dialog.onSuccess || function () {};
         $scope.dialog.onFailure = $scope.dialog.onFailure || function () {};
      }
   };
}]);

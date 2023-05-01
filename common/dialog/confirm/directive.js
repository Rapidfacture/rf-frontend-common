app.directive('rfDialogConfirm', ['$timeout', function ($timeout) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/dialog/confirm/template.html',
      scope: {
         dialog: '=',
         lang: '=',
         autofocus: '=?'
      },
      link: function ($scope, elem, attr, ctrl) {
         $scope.dialog.onSuccess = $scope.dialog.onSuccess || function () {};
         $scope.dialog.onFailure = $scope.dialog.onFailure || function () {};

         function autofocus () {
            var btn = document.getElementById('dialog-confirm-no-btn');
            // console.log(btn);
            btn.focus({ focusVisible: true });
         }

         $scope.autofocus = autofocus;

      }
   };
}]);

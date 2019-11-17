/**
 * @desc login menu including settings, administration, about, support
 *
 * @version 0.0.6
 *
 * @example
 * <rf-login-menu></rf-login-menu>
 *
 */

app.directive('rfLoginMenu', ['$rootScope', 'loginFactory', '$state', 'config',
   function ($rootScope, loginFactory, $state, config) {
      return {
         restrict: 'E',
         templateUrl: 'global/common/loginMenu/template.html',
         scope: true,
         link: function ($scope, element) {
            loginFactory.initAndRefreshOnLogin(function (loginData, loggedIn) {
               $scope.loggedIn = loggedIn;
               $scope.userName = loginFactory.getUserName();
               $scope.isAdmin = loginFactory.isLoginAdmin();

               var urls = loginFactory.getAppUrls('rf-app-erp');
               if (urls.main && urls.profile) {
                  $scope.profileUrl = urls.main + urls.profile;
                  $scope.adminAreaUrl = urls.main + urls.adminArea;
               }

               $scope.app = config.app;

               var states = $state.get();
               states.forEach(function (state) {
                  if (state.name === 'settings') {
                     $scope.showSettings = true;
                  }
               });
            });

            $scope.logout = function () {
               $scope.showMenu = false;
               loginFactory.logout();
               $scope.$emit('note_alert', 'logout');
            };
         }
      };
   }
]);

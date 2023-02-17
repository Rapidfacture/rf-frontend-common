/** meta dialog directive
 * @desc Gloabal dialog box. Can be triggered from anywhere by event.
 * manages animated box and quit function
 *
 * @version 0.3.0
 *
 * place this in the index html:
 * <rf-dialog></rf-dialog>
 * <rf-dialog mode="child"></rf-dialog>
 *
 * @example simple
 *  //                          type
 * $scope.$broadcast('dialog', "about");
 *
 * @example complex
 *     //                       type        arg1      obj put in $scope.rfDialog
 *     $scope.$emit('dialog', "confirm", {onSuccess: function() {
 *              http.post('removedrawing', {
 *                  'data': $scope.drawing._id
 *              }, function(response) {
 *                  if (response.err) {
 *                      $scope.$emit("error", response.err);
 *                  }
 *                  $state.go('drawing.list');
 *              });
 *          }
 *      });
 *
 * @todo
 * own child scope for childeren, that can be destroyed
 * multiple dialogs
 */

app.directive('rfDialog', ['$compile', '$timeout', '$rootScope', 'langFactory', 'eventFactory', function ($compile, $timeout, $rootScope, langFactory, eventFactory) {
   // the eventFactory is only here so it is initialised
   return {
      restrict: 'E', // attribute or element
      templateUrl: 'global/common/dialog/main/main.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {

         $scope.mode = attr.mode || 'main';
         $scope.visible = false; // init: hide dialog

         // refesh language in scope
         $scope.lang = langFactory.getTranslations();
         $scope.$on('languageSet', function (meta, lang) { // reload on change
            $scope.lang = langFactory.getTranslations();
         });

         var childName = 'dialog-child';
         var eventName = ($scope.mode === 'main') ? 'dialog' : childName;
         $rootScope.$on(eventName, function (event, type, forwardObject) {

            // use keys in forwardObject:
            // onSuccess
            // beforeQuit
            // afterQuit
            // headertext
            // message
            // data

            // already active => try to open second instance
            if ($scope.mode === 'main' && $scope.visible) {
               $rootScope.$broadcast(childName, type, forwardObject);
               return;
            }

            $scope.rfDialog = forwardObject || {};
            var dialog = $scope.rfDialog;
            // force a refresh of the scope for translations
            $timeout(function () {
               dialog.message = langFactory.translate(dialog.message) || '';
               dialog.headerText = langFactory.translate(dialog.headerText) || '';
            }, 1);
            dialog.type = type || 'confirm';
            dialog.quit = function (callback) {
               callback = callback || function () {};
               if (dialog.beforeQuit) {
                  dialog.beforeQuit();
               }
               close(function () {
                  callback();
                  if (dialog.afterQuit) {
                     dialog.afterQuit();
                  }
               });
            };

            $scope.greyLayerClick = function () {
               if (dialog.disableGreyLayerClose) {
                  $scope.showClosingInfo = true;
                  $timeout(function () {
                     $scope.showClosingInfo = false;
                  }, 1200);
               } else {
                  dialog.quit();
               }
            };

            $scope.$on('escape', function () {
               var isDialogChildActive = document.getElementsByClassName('dialog-child active').length === 1;
               if (($scope.mode === 'main' && !isDialogChildActive) ||
               ($scope.mode !== 'main' && isDialogChildActive)) {
                  dialog.quit();
               }
            });

            function close (callback) {
               callback = callback || function () {};
               $timeout(function () {
                  $scope.visible = false;
                  callback();
               }, 160);
            }

            var dialogBody = elem.find('dialog-body');
            dialogBody.html('<rf-dialog-' + dialog.type + ' lang="lang" dialog="rfDialog"></rf-dialog-' + dialog.type + '>');
            $compile(elem.contents())($scope);

            // show dialog
            $scope.visible = true;
         });

         $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
            if ($scope.visible && $scope.mode === 'main') {
               event.preventDefault();
               alert('Please close the dialog first.');
            }
         });
      }
   };
}]);

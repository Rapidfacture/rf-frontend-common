/** meta dialog directive
 * @desc Gloabal dialog box. Can be triggered from anywhere by event.
 * manages animated box and quit function
 *
 * @version 0.3.0
 *
 * place this in the index html:
 * <rf-modal></rf-modal>
 * <rf-modal mode="child"></rf-modal>
 *
 * @example simple
 *  //                          type
 * $scope.$broadcast('modal', "about");
 *
 * @example complex
 *     //                       type        message      obj put in $scope.rfModal
 *     $scope.$emit('modal', "confirm", "removeDrawing", {onSuccess: function() {
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
 * multiple modals
 */

app.directive('rfModal', ['$compile', '$timeout', '$rootScope', 'eventFactory', 'langFactory', function ($compile, $timeout, $rootScope, eventFactory, langFactory) {
   return {
      restrict: 'E', // attribute or element
      templateUrl: 'global/common/modal/mainModal/main.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {

         $scope.mode = attr.mode || 'main';
         $scope.visible = false; // init: hide modal

         // refesh language in scope
         $scope.lang = langFactory.getTranslations();
         $scope.$on('languageSet', function (meta, lang) { // reload on change
            $scope.lang = langFactory.getTranslations();
         });

         var childName = 'modal-child';
         var eventName = ($scope.mode === 'main') ? 'modal' : childName;
         $rootScope.$on(eventName, function (event, type, message, forwardObject) {

            // already active => try to open second instance
            if ($scope.mode === 'main' && $scope.visible) {
               $rootScope.$broadcast(childName, type, message, forwardObject);
               return;
            }

            // use keys in forwardObject:
            // onSuccess
            // beforeQuit
            // afterQuit
            // console.log(forwardObject);
            forwardObject = forwardObject || {};
            $scope.rfModal = forwardObject;
            $scope.rfModal.type = type || 'confirm';
            $scope.rfModal.message = langFactory.translate(message) || '';
            $scope.rfModal.headerText = forwardObject.headerText || '';
            $scope.rfModal.quit = function (callback) {
               callback = callback || function () {};
               if ($scope.rfModal.beforeQuit) {
                  $scope.rfModal.beforeQuit();
               }
               close(function () {
                  callback();
                  if ($scope.rfModal.afterQuit) {
                     $scope.rfModal.afterQuit();
                  }
                  eventFactory.deleteEscapeListener($scope.rfModal.quit);
               });
            };

            $scope.greyLayerClick = function () {
               if ($scope.rfModal.disableGreyLayerClose) {
                  $scope.showClosingInfo = true;
                  $timeout(function () {
                     $scope.showClosingInfo = false;
                  }, 1200);
               } else {
                  $scope.rfModal.quit();
               }
            };

            // press "ESC" to close modal
            eventFactory.addEscapeListener($scope.rfModal.quit);

            function close (callback) {
               callback = callback || function () {};
               $scope.fade = false;
               $timeout(function () {
                  $scope.visible = false;
                  callback();
               }, 160);
            }

            var modalBody = elem.find('modal-body');
            modalBody.html('<rf-modal-' + $scope.rfModal.type + ' lang="lang" modal="rfModal"></rf-modal-' + $scope.rfModal.type + '>');
            $compile(elem.contents())($scope);

            // show dialog
            $scope.visible = true;
            $timeout(function () {
               $scope.fade = true;
            }, 40);
         });
      }
   };
}]);

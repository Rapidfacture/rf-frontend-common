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

app.directive('rfModal', ['$compile', '$timeout', '$rootScope', 'langFactory', 'eventFactory', function ($compile, $timeout, $rootScope, langFactory, eventFactory) {
   // the eventFactory is only here so it is initialised
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

            $scope.$on('escape', function () {
               var isModalChildActive = document.getElementsByClassName('modal-child active').length === 1;
               if (($scope.mode === 'main' && !isModalChildActive) ||
               ($scope.mode !== 'main' && isModalChildActive)) {
                  $scope.rfModal.quit();
               }
            });

            function close (callback) {
               callback = callback || function () {};
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
         });
      }
   };
}]);

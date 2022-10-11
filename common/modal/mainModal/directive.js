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
 *     //                       type        arg1      obj put in $scope.rfModal
 *     $scope.$emit('modal', "confirm", {onSuccess: function() {
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

            $scope.rfModal = forwardObject || {};
            var modal = $scope.rfModal;
            modal.message = langFactory.translate(modal.message) || '';
            modal.headerText = langFactory.translate(modal.headerText) || '';
            modal.type = type || 'confirm';
            modal.quit = function (callback) {
               callback = callback || function () {};
               if (modal.beforeQuit) {
                  modal.beforeQuit();
               }
               close(function () {
                  callback();
                  if (modal.afterQuit) {
                     modal.afterQuit();
                  }
               });
            };

            $scope.greyLayerClick = function () {
               if (modal.disableGreyLayerClose) {
                  $scope.showClosingInfo = true;
                  $timeout(function () {
                     $scope.showClosingInfo = false;
                  }, 1200);
               } else {
                  modal.quit();
               }
            };

            $scope.$on('escape', function () {
               var isModalChildActive = document.getElementsByClassName('modal-child active').length === 1;
               if (($scope.mode === 'main' && !isModalChildActive) ||
               ($scope.mode !== 'main' && isModalChildActive)) {
                  modal.quit();
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
            modalBody.html('<rf-modal-' + modal.type + ' lang="lang" modal="rfModal"></rf-modal-' + modal.type + '>');
            $compile(elem.contents())($scope);

            // show dialog
            $scope.visible = true;
         });
      }
   };
}]);

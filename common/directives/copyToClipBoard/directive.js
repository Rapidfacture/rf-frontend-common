/** rf copy to clipbeard
 * @desc
 *  copy a scope variable or the inner text of a html element on click
 *
 * @version 0.0.1
 *
 * @example
 *     <a rf-copy-to-clip-board>{{task.orderNumber}}</a>
 *     <a rf-copy-to-clip-board="stringToCopy">{{task.orderNumber}}</a>
 *
 */


app.directive('rfCopyToClipBoard', [function () {
   return {
      restrict: 'A',
      scope: {
         rfCopyToClipBoard: '='
      },
      link: function ($scope, elem, attr, ctrl) {

         function copyToClipboard () {
            var string = $scope.rfCopyToClipBoard || elem[0].innerText;
            copyStringToClipboard(string); // eslint-disable-line no-undef
            $scope.$emit('note_info', {message: 'copiedToClipboard', timeout: 1});
            if (!$scope.$$phase) $scope.$apply(); // new refresh cycle if inactive
         };

         elem[0].onclick = copyToClipboard;
      }
   };
}]);

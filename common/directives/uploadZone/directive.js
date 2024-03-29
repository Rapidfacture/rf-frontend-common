/** rf-upload-zone-custom
 *
 * get all files in one array after the upload
 *
 * @example simple
 *          <rf-upload-zone on-upload="onUpload" multiple="true">
 *              <div class="rf-btn">
 *                <i class="fa fa-plus"></i>
 *              </div>
 *          </rf-upload-zone>
 *
 * @example combined: drag and drop and upload link; use predefied style
 *          <rf-upload-zone on-upload="onUpload" multiple="true" class="default-style">
 *             Drop files here or
 *             <a class="file-select">click here</a>
 *             to upload.
 *          </rf-upload-zone>
 *
 * @example further options
 *             <rf-upload-zone
                  on-upload="onUpload"          uploadFunction(files, additionalDataToPass)
                  multiple="true"
                  drag="true"                   drag files
                  fileselect="true"             click to this element to open upload window
                  data="additionalDataToPass"   passed as second parameter to the on-upload function
                  file-size-limit="10"          limit in MB
                  read-as-text="true">          otherwise read as arrayBuffer
                <div class="col-sm-12 add">
                  <i class="fa fa-plus"></i>
                  <span>
                     <b>{{lang.importOrRequestButtonHeadline}}</b>
                     <br>
                     <small>{{lang.importOrRequestButtonSubheader}}</small>
                     <br>
                  </span>
                </div>
             </rf-upload-zone>
 *
 *  @version 0.2.2
 *
 */

app.directive('rfUploadZone', ['langFactory', function (langFactory) {
   return {
      restrict: 'E', // called on class "uploadDirective"
      // templateUrl: 'global/directives/uploadZoneCustom/template.html',
      scope: {
         onUpload: '=',
         data: '='
      },
      link: function ($scope, elem, attr) {
         $scope.lang = langFactory.getTranslations();

         // html elements
         var uploadZone = elem[0];

         var hiddenInput = document.createElement('input');
         hiddenInput.multiple = !!attr.multiple || false;
         hiddenInput.type = 'file';
         hiddenInput.classList.add('hidden');
         uploadZone.appendChild(hiddenInput);

         var hiddenDropLayer = document.createElement('div');
         hiddenDropLayer.classList.add('hidden-drop-layer');
         uploadZone.appendChild(hiddenDropLayer);

         var hiddenTestUploadButton = document.createElement('div');
         hiddenTestUploadButton.setAttribute('data-cy', 'hidden-test-upload-btn');
         uploadZone.appendChild(hiddenTestUploadButton);

         var fileSelectElement = null;


         // wait until inner content was loaded (fileSelectElement)
         setTimeout(function () {
            fileSelectElement = uploadZone.getElementsByClassName('file-select')[0];

            // noting configured => enabling fileselect and drag&drop
            if (attr.fileselect !== 'false' && attr.drag !== 'false') {
               attr.fileselect = true;
               attr.drag = true;
            }

            // fileselect on click
            if (attr.fileselect || fileSelectElement) {
               // init upload button
               hiddenInput.addEventListener('change', function () {
                  upload(hiddenInput.files);
               });

               // specific html element to open upload dialog?
               if (fileSelectElement) {
                  fileSelectElement.addEventListener('click', function () {
                     hiddenInput.click();
                  });
               // otherwise take whole element
               } else {
                  uploadZone.addEventListener('click', function () {
                     hiddenInput.click();
                  });
               }
            }

            // drag&drop
            if (attr.drag) {
               initializeDragAndDrop(uploadZone, upload);
            }
         }, 400);


         function upload (files) {
            var fileInfos = [];
            var fileIndex = 0;
            var numOfFiles = files.length;

            checkNextFile();

            function checkNextFile () {
               var indexOfLast = numOfFiles - 1;
               // finished?
               if (fileIndex === indexOfLast) {
                  addFile(fileIndex, function () {
                     $scope.onUpload(fileInfos, $scope.data);
                  });

               // next file
               } else {
                  addFile(fileIndex, function () {
                     fileIndex++;
                     checkNextFile();
                  });
               }
            }

            function addFile (fileIndexCounter, callback) {
               fileIntoMemory(files[fileIndexCounter], fileIndexCounter, function (fileInfo, index) {
                  var fileSizeLimit = attr.fileSizeLimit ? parseInt(attr.fileSizeLimit) : null;
                  var fileTooLarge = fileSizeLimit && fileInfo && fileInfo.size > fileSizeLimit * 1000000;

                  if (fileTooLarge) {
                     console.log('filesize is limited to ' + fileSizeLimit + 'MB, aborting.');
                     return $scope.$emit('note_warning', 'filesizeLimited');
                  } else {
                     // filename without extension
                     fileInfo.shortName = fileInfo.filename.replace(/\.[^/.]+$/, '');
                     fileInfo.extension = fileInfo.filename.split('.').pop();

                     fileInfos.push(fileInfo);
                  }

                  if (callback) callback();
               });
            }
         }

         // for external testing via cypress

         hiddenTestUploadButton.addEventListener('click', function () {
            console.log('try uploading files');
            testUpload();
         });
         function testUpload () {
            console.log('testUpload', rfUploadZoneTestFactory.hasFiles());
            if (rfUploadZoneTestFactory && rfUploadZoneTestFactory.hasFiles()) {
               var content = rfUploadZoneTestFactory.get();
               console.log('uploading', content.files.length, ' files');
               $scope.onUpload(content.files, content.data);
               rfUploadZoneTestFactory.clear();

            }
         }


         // Sources:
         // https://techoverflow.net/2018/03/30/how-to-add-js-drag-drop-file-upload-without-any-dependencies/
         // https://techoverflow.net/2018/03/30/reading-an-uploaded-file-into-memory-using-pure-javascript/


         /**
          * Initialize drag & drop event handling for a DOM element.
          * The DOM element does not have to be empty in order to do this.
          * @param elem The DOM element where files can be dragged & dropped
          * @param callback The callback(files) function that gets passed a list of files
          * when files are dragged and dropped.
          *
          * Basic usage example:
          *
          *  initializeDragAndDrop(elem, function(files) {
          *     for (var i = 0; i < files.length; i++) {
          *        readAndAddFile(files[i]);
          *     }
          *  })
          */
         var listenToEvents = false;

         // Saves if drag was started in this element
         var dragStarted = false;

         function initializeDragAndDrop (elem, onDrop) {
            elem.classList.add('show-drop');

            elem.addEventListener('dragstart', function () {
               dragStarted = true;
            });

            elem.addEventListener('dragend', function () {
               dragStarted = false;
            });

            // dragenter => add class 'show-drop'
            elem.addEventListener('dragenter', function (event) {
               if (dragStarted) return;

               preventDefault(event);
               hiddenDropLayer.style.display = 'block';

               setTimeout(function () {
                  listenToEvents = true;
               }, 100);
            }, false);

            // dragleave => remove class 'show-drop'
            elem.addEventListener('dragleave', function (event) {
               preventDefault(event);
               if (!listenToEvents) return;

               listenToEvents = false;
               hiddenDropLayer.style.display = 'none';

            }, false);

            // drop: get the file
            elem.addEventListener('drop', function (event) {
               preventDefault(event);
               hiddenDropLayer.style.display = 'none';
               if (!dragStarted) onDrop(event.dataTransfer.files);

            }, false);

            // not in use, we just prevent things
            elem.addEventListener('dragover', preventDefault, false);
            elem.addEventListener('dragdrop', preventDefault, false);

            function preventDefault (event) {
               event.stopPropagation();
               event.preventDefault();
            }
         }



         /**
          * Utility function that can be used as handler wrapper
          * for initializeDragAndDrop.
          * This reads the entire file into memory
          *
          * The handler function gets passed an array of objects:
          * {
          *     name: filename as string,
          *     size: size in bytes as number,
          *     type: MIME type as string,
          *     content: file content as Uint8Array
          * }
          * @param file The file to read
          * @param handler
          */
         function fileIntoMemory (file, index, callback) {
            // eslint-disable-next-line no-undef
            var reader = new FileReader();
            var asText = !!attr.readAsText;
            reader.onload = function () {
               var content = asText ? this.result : new Uint8Array(this.result);
               callback({
                  filename: file.name,
                  size: file.size,
                  mimetype: file.type,
                  content: content
               }, index);
            };
            if (asText) {
               reader.readAsText(file);
            } else {
               reader.readAsArrayBuffer(file);
            }

         }

      }
   };
}]);

/* eslint no-unused-vars: 0 */
var rfUploadZoneTestFactory = {
   files: [],
   data: {},
   hasFiles: function () {
      return this.files.length !== 0;
   },
   get: function () {
      return {files: this.files, data: this.data};
   },
   set: function (files, data) {
      this.files = files;
      if (data) this.data = data;
   },
   clear: function () {
      this.files = [];
   }
};

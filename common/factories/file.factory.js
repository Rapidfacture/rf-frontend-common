/** fileFactory
 * @desc deal with attached files to json meta data
 * @version 0.0.8
 */

app.factory('fileFactory', ['http', 'loginFactory', '$rootScope', function (http, loginFactory, $rootScope) {
   return {
      saveFile: _saveFile, // fileFactory.saveFile(endPointUrl, file, metaDoc, filetype, successFunc)

      removeFile: _removeFile, // fileFactory.removeFile(endPointUrl, file, successFunc)

      downloadFile: _downloadFile, // fileFactory.downloadFile(endPointUrl, file)

      openFileIframe: _openFileIframe, // fileFactory.openFileIframe(endPointUrl, file, metaDoc, successFunc)

      openFileNewTab: _openFileNewTab, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      openFileNewWindow: _openFileNewWindow, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      getFileUrl: _getFileUrl, // fileFactory.getFileUrl(endPointUrl, file, metaDoc, forceDownload)

      getFileDownloadUrl: _getFileDownloadUrl,

      unit8ToArray: _unit8ToArray,

      getFirstUsableFile: _getFirstUsableFile
   };

   function _saveFile (endPointUrl, files, metaDoc, filetype, successFunc, errFunction) {
      var counter = 0;
      metaDoc = metaDoc || {};
      if (!Array.isArray(files)) files = [files];

      nextFile();

      function nextFile () {
         var file = files[counter];
         _saveSingleFile(endPointUrl, file, metaDoc, filetype, function (data) {
            metaDoc = data;
            counter++;
            if (counter < files.length) {
               nextFile();
            } else {
               successFunc(metaDoc);
            }
         }, errFunction);

      }
   }

   function _saveSingleFile (endPointUrl, file, metaDoc, filetype, successFunc, errFunction) {
      file.filename = file.filename || file.name; // try to prevent missing file.filename
      var headers = {
         fileId: metaDoc._id,
         filename: encodeURIComponent(file.filename),
         extension: file.extension || file.filename.split('.').pop(),
         mimetype: file.mimetype
      };

      if (filetype) headers.filetype = filetype;
      http.fileSave(endPointUrl, {
         content: file.contentUint8Array || file.content,
         mimetype: file.mimetype,
         headers: headers
      }, function (response) {
         if (successFunc) successFunc(response);
      }, function (err) {
         if (errFunction) errFunction(err);
      });
   }



   function _removeFile (endPointUrl, file, successFunc, opts) {
      var modalname = 'confirm';
      var modalData = {
         onSuccess: function () {
            http.post(endPointUrl, file.fileId,
               function (response) {
                  if (successFunc) successFunc(response);
               });
         },
         onFailure: function () {
            console.log('fail');
         }
      };

      opts = opts || {};
      if (opts.confirmText) {
         modalname = 'confirm-input';
         modalData.confirmText = opts.confirmText;
      }

      $rootScope.$emit('modal', modalname, 'removeFile', modalData);
   }

   function _downloadFile (endPointUrl, data) {
      var url = _getFileDownloadUrl(endPointUrl, data, 'forceDownload');
      window.open(url, '_blank');
   }

   function _openFileIframe (endPointUrl, file, metaDoc, successFunc) { // open in an iframe
      var url = _getFileUrl(endPointUrl, file, metaDoc, false);
      if (url) { // only if it can be opened
         $rootScope.$broadcast('modal', 'file-viewer', null, {data:
            {endPointUrl: endPointUrl, file: file, metaDoc: metaDoc}});
      }
   }

   function _openFileNewTab (endPointUrl, file, metaDoc, successFunc) {
      var url = _getFileUrl(endPointUrl, file, metaDoc);
      if (url) { // only if it can be opened
         window.open(url, '_blank');
      }
   }

   function _openFileNewWindow (endPointUrl, file, metaDoc, successFunc, newWindowProperties) {
      var url = _getFileUrl(endPointUrl, file, metaDoc);
      var windowName = 'file';
      if (file.filename) windowName += (' ' + file.filename);
      newWindowProperties = newWindowProperties || 'width=600,height=400';

      if (url) { // only if it can be opened
         window.open(url, windowName, newWindowProperties);
      }
   }

   function _getFileUrl (endPointUrl, file, metaDoc, forceDownload, noWarning) {

      // remove data binding, as we don't want to change anything here
      file = JSON.parse(JSON.stringify(file));
      metaDoc = JSON.parse(JSON.stringify(metaDoc));

      if (file.mimetype === 'application/json') {
         return _getCadUrl(metaDoc);
      } if (file.mimetype === 'model/stl' || file.mimetype === 'model/x.stl-binary' || file.mimetype === 'application/sla' || file.extension === 'stl') {
         if (forceDownload) {
            return _getFileDownloadUrl('drawing-file', file, true);
         } else { // Not force download
            // Opens the viewer in an iframe which will
            // in turn load the actual STL file using our token
            return _getFileDownloadUrl('3d.html', file, false).replace('/api', '');
         }
      } else {
         var m = file ? file.mimetype : '';
         if (forceDownload || m === 'application/pdf' | m === 'application/x-download' | m === 'image/png' | m === 'image/jpeg' | m === 'image/gif' | m === 'image/svg+xml') {
            return _getFileDownloadUrl(endPointUrl, file, forceDownload);
         } else {
            if (!noWarning) $rootScope.$emit('note_alert', 'Cannot open fileType ' + file.mimetype);
            return false;
         }
      }
   }

   function _getFileDownloadUrl (endPointUrl, data, forceDownload) {
      var tokenURL = loginFactory.getToken();
      data = JSON.parse(JSON.stringify(data)); // prevent modification of the original obj
      data.forceDownload = !!forceDownload;
      var dataURL = encodeURIComponent(JSON.stringify(data));
      return http.getUrl(endPointUrl) + '?data=' + dataURL + '&token=' + tokenURL;
   }

   function _getFirstUsableFile (meta) {
      var i = 0;
      var files = meta.files || [];
      var firstUsableFile = null;
      // console.log('_getFirstUsableFile', meta);

      // see if one of the file can be opened
      while (i < files.length && !fileCanBeOpened(firstUsableFile)) {
         // console.log('iteration', i, files[i]);
         firstUsableFile = files[i];
         i++;
      }

      function fileCanBeOpened (file) {
         if (!file) return false;
         return _getFileUrl('drawing-file', file, meta, null, 'noWarning');
      }

      return firstUsableFile;
   }

   function _getCadUrl (drawing) {
      var urls = loginFactory.getAppUrls('rf-app-cad');
      var url = urls.main + urls.loadDrawing + drawing.hash;
      url = loginFactory.addTokenToUrl(url);
      return url;
   }

   function _unit8ToArray (uint) {
      var chuck = 1024 * 64; // 64kB
      var text = '';
      var len = uint.byteLength;

      // console.log('uint', uint);

      if (len < chuck) {
         text = String.fromCharCode.apply(null, uint);
      } else {
         for (var i = 0; i < (len / chuck); i++) {
            var arr = uint.slice(i * chuck, (i + 1) * chuck);
            text += String.fromCharCode.apply(null, arr);
         }
      }
      // console.log('text', text);

      // conversion is necessary; nodemailer seems to handle only simple arrays
      var content = []; // normal array
      for (i = 0; i < text.length; i++) {
         content.push((text[i]).charCodeAt(0));
      }
      return content;
   }

}]);
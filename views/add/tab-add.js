angular.module('myApp.addTab', ['myApp.env'])

.factory('Camera', ['$q', function($q) {

  return {

    getPicture: function(options) {
      var q = $q.defer();

      navigator.camera.getPicture(function(result) {
        // Do any magic you need
        q.resolve(result);
      }, function(err) {
        q.reject(err);
      }, options);

      return q.promise;
    }
  }
}])

.factory('s3Uploader', ['$q','$http', function($q, $http) {
 
  var upload = function(imageURI, fileName) {

      var signingURI = "http://127.0.0.1:8000/api/sign_s3";
 
        var q = $q.defer();
        var ft = new FileTransfer();
        var options = new FileUploadOptions();
 
        options.fileKey = "file";
        options.fileName = fileName;
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
 
        $http.post(signingURI, {"fileName": fileName})
            .then(function (data) {
              console.log('http post data', JSON.stringify(data));

                options.params = {
                    "key": fileName,
                    "AWSAccessKeyId": data.data.awsKey,
                    "acl": "public-read",
                    "policy": data.data.policy,
                    "signature": data.data.signature,
                    "Content-Type": "image/jpeg"
                };
 
                ft.upload(imageURI, "https://" + data.data.bucket + ".s3.amazonaws.com/",
                    function (e) {
                        q.resolve(e);
                    },
                    function (e) {
                        alert("Upload failed");
                        q.reject(e);
                    }, options);
 
            }, function (error) {
                console.log('fail', JSON.stringify(error));
            });
 
        return q.promise;
 
    }
 
    return {
        upload: upload
    }

}])

.controller('addCtrl', function($scope, $state, Post, Camera, s3Uploader, $http, $rootScope, $timeout) {

  $scope.imageOne;
  $scope.imageTwo;

  $scope.post = {
    title: '',
    description : ''   
  };  

   // Generate a random name with random characters
  var fileNameGenerator = function() {
    return Math.random().toString(36).substr(2, 15) + '.jpg';
  }
   
  $scope.submitPost = function(form) {
    if(form.$valid) {

      var fileOneName = fileNameGenerator();
      var fileTwoName = fileNameGenerator();

      $scope.post.pictureA = 'https://s3-us-west-2.amazonaws.com/whichone-picture/' + fileOneName;
      $scope.post.pictureB = 'https://s3-us-west-2.amazonaws.com/whichone-picture/' + fileTwoName;

      s3Uploader.upload($scope.imageOne, fileOneName).then(function() {
        s3Uploader.upload($scope.imageTwo, fileTwoName).then(function() {
          Post.addPost($scope.post).then(function(){
            $timeout(function(){$rootScope.$emit('dashRefresh');}, 200)
            $state.go('tab.dash');
          }, function() {
            console.log("Saving post failed");
          });
        }, function() {
          console.log("Upload Picture 2 failed");
        });
      }, function() {
        console.log("Upload Picture 1 failed")
      });

    } else {
      console.log('Form submit error');
    }
  }; 

  var options = { 
    quality : 80, 
    allowEdit : true,
    encodingType: navigator.camera.EncodingType.JPEG,
    targetWidth: 500,
    targetHeight: 500,
    saveToPhotoAlbum: false
  };

  $scope.takePictureCamera = function(imageNumber) {
    options.sourceType = navigator.camera.PictureSourceType.CAMERA;

    Camera.getPicture(options).then(function(imageURI) {
      if (imageNumber === 'picture-one') {
        $scope.imageOne = imageURI;
      } else {
        $scope.imageTwo = imageURI;
      }

      angular.element('.picture-container.' + imageNumber).css('background-image', 'url('+imageURI+')' );

    }, function(err) {
      console.err('error while taking picture', err);
    });
  };

  $scope.takePictureLibrary = function(imageNumber) {
    options.sourceType = navigator.camera.PictureSourceType.PHOTOLIBRARY;

    Camera.getPicture(options).then(function(imageURI) {
      if (imageNumber === 'picture-one') {
        $scope.imageOne = imageURI;
      } else {
        $scope.imageTwo = imageURI;
      }
      angular.element('.picture-container.' + imageNumber).css('background-image', 'url('+imageURI+')' );

    }, function(err) {
      console.err('error while taking picture', err);
    });
  };

});
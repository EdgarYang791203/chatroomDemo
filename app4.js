// 建立聊天室的參考物件

// 有人輸入內容時 產生動畫
// 當 typing的值 發生改變的時候 秀出動畫
var chatroomRef = db.doc("/chatrooms/1");
chatroomRef.onSnapshot(function (snapshot) {
    var chatroom = snapshot.data();
    if (chatroom.typing) {
        $("#typing").addClass("hidden");
        $("#thinking").removeClass("hidden");
    } else {
        $("#typing").removeClass("hidden");
        $("#thinking").addClass("hidden");
    }
});

chatroomRef.collection("users").onSnapshot(function (snapshot) {
    snapshot.docChanges.forEach(function (change) {
        if (change.type === "added") {
            var user = change.doc.data();
            var html = `<img width="30" class="circle" src = "https://i.pinimg.com/originals/3f/a6/41/3fa64186a237c743ca222c224d4ae3e2.gif"> : ${user.displayName} 上線了`;
            $("<li></li>").html(html).appendTo($("#chats"));
        }
        if (change.type === "removed") {
            var user = change.doc.data();
            var html = `<img width="30" class="circle" src = "https://i.pinimg.com/originals/3f/a6/41/3fa64186a237c743ca222c224d4ae3e2.gif"> : ${user.displayName} 下線了`;
            $("<li></li>").html(html).appendTo($("#chats"));
        }
    });
});

// 建立聊天訊息的集合的參考
// 建立聊天訊息的集合的參考

var chatsRef = db.collection("/chatrooms/1/chats");
chatsRef.onSnapshot(function (snapshot) {
    snapshot.docChanges.forEach(function (change) {

        if (change.type === "added") {
            //console.log(change.doc.data());
            var chat = change.doc.data();
            var html = `<img class="circle" width="25" src="${chat.user.photoURL  }" alt="${chat.user.displayName}">: `;
            if (chat.contentType === "text") {
                html += `${chat.message}`;
            } else {
                imageURL = chat.message;
                html += `<img src="${imageURL}" width="100">`;
            }

            $("<li>").html(html).appendTo($("#chats"));
        }
    });
});
var provider = new firebase.auth.GoogleAuthProvider();
var uid;
var currentUser;
$("#login").click(function () {
    firebase.auth().signInWithPopup(provider).then(function (result) {
        // This gives you a Google Access Token. You can use it to access the Google API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        currentUser = result.user;
        //console.log(currentUser);
        // ...
    }).catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
    });
});

$("#logout").click(function () {
    firebase.auth().signOut().then(function () {
        // Sign-out successful.
        db.doc(`/chatrooms/1/users/${currentUser.uid}`).delete();
        currentUser = null;
        $("#message").unbind("keydown");
        $("#message").unbind("keyup");
    }).catch(function (error) {
        // An error happened.
    });
});

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        var defaultPhotoURL = "https://lh3.googleusercontent.com/QxwCl0OGns9IK2n0wdGpJw4Ol8Z5U0ucnmbhaQOduxv6XpFdrAfGxodGk-XiI-KeAAY=s180";
        // User is signed in.
        currentUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };
        chatroomRef.collection("users").doc(`${user.uid}`).set(currentUser);
        if (currentUser.photoURL == "https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg") {
            currentUser.photoURL = defaultPhotoURL;
        }
        // 如果使用者登入成功
        // 顯示 登出按鈕 隱藏 登入按鈕
        $("#username").removeClass("hidden");
        $("#username").text(currentUser.displayName);
        $("#user-photo").removeClass("hidden");
        $("#user-photo").attr("src", currentUser.photoURL);
        $("#login").addClass("hidden");
        $("#logout").removeClass("hidden");
        $("#checkout").removeClass("hidden");

        // 當有人打字的時候 修改chatroom的typing狀態
        $("#message").keydown(function (e) {
            //console.log(e.keyCode);
            chatroomRef.update({
                typing: true
            });
            $("#message").blur(function (e) {
                chatroomRef.update({
                    typing: false
                });
            });
        });
        $("#message").keyup(function (e) {
            //console.log(e.keyCode);
            if (e.keyCode === 13) {
                if (e.target.value.length == 0 || e.target.value == " ") {
                    chatroomRef.update({
                        typing: false
                    });
                    $(this).val("");
                    return
                } else {
                    // 把訊息 送到 firebase
                    chatsRef.add({
                        message: $(this).val(),
                        contentType: "text",
                        user: currentUser
                    });
                    chatroomRef.update({
                        typing: false
                    });
                    $(this).val("");
                }
            }
        });
        // ==========================================================================
        var storageRef = storage.ref();

        function uploadAndAddImageMessage(file) {

            var imageRef = storageRef.child(file.name);
            imageRef.put(file).then(function (snapshot) {
                console.log(snapshot);
                chatsRef.add({
                    message: snapshot.downloadURL,
                    contentType: snapshot.metadata.contentType,
                    user: currentUser
                });
            });
        }
        $("#file").change(function () {

            var file = this.files[0];
            uploadAndAddImageMessage(file);
        });

        $(".dropzone")
            .on("drag dragstart dragend dragover dragenter dragleave drop", function (e) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on("dragover dragenter", function () {
                $(this).addClass("dragenter");
            })
            .on("dragleave dragend drop", function () {
                $(this).removeClass("dragenter");
            })
            .on("drop", function (e) {

                var files = e.originalEvent.dataTransfer.files;
                Object.keys(files).forEach(function (key) {

                    var file = files[key];
                    uploadAndAddImageMessage(file);
                });
            });
    } else {
        // 如果使用者沒有登入
        // 顯示 登入按鈕 隱藏 登出按鈕
        $("#username").addClass("hidden");
        $("#user-photo").addClass("hidden");
        $("#login").removeClass("hidden");
        $("#logout").addClass("hidden");
    }
});
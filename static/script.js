// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

let CURRENT_ROOM = 0;

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)


// -----------------------------------------
// ----------- User functions ---------

// function hasValidCredentials(params) {
//   // This function should check for valid credentials.
//   // For simplicity, we'll check Local Storage, but in a real app,
//   // this might involve checking a cookie or making an API call.
//   return localStorage.getItem('api_key') === 'valid'; // TODO : edit this with signup stuffs
// }

async function oneClickSignup() {
  console.log("one click sign up");
  try {
    // Call your API to signup and get an API key
    const response = await fetch('/api/signup', {
      method: 'POST',
      // Include any necessary headers or body according to your API
    });
    const user = await response.json();
    console.log(user.api_key);

    if (user.api_key) {
      // Store the API key in Local Storage
      localStorage.setItem('api_key', user.api_key);
      localStorage.setItem('user_name', user.username);
      localStorage.setItem('password', user.password);
      alert('Signup successful! API key stored.');
      navigateTo('/');
    }
  } catch (error) {
    console.error('Error during signup:', error);
  }
}

function logout() {
  localStorage.removeItem('api_key');
  localStorage.removeItem('user_name');
  localStorage.removeItem('password');
  window.location.reload();
}

async function login() {
  try {
    // Call your API to signup and get an API key
    var user_name = document.querySelector('.alignedForm.login input[name="username"]').value;
    var password = document.querySelector('.alignedForm.login input[name="password"]').value;

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "user_name": user_name,
        "password": password
      }),
    });

    const user = await response.json();
    console.log(user.api_key); // extract api_key

    // Displaying Credential Error Message
    const failedElement = document.getElementById('failed-login-msg');

    if (user.api_key) {
      // Store the API key in Local Storage
      console.log("test2")
      localStorage.setItem('api_key', user.api_key);
      localStorage.setItem('user_name', user.username);
      localStorage.setItem('password', user.password);
      alert('Login successful! API key stored.');
      failedElement.classList.add("hide");
      navigateTo('/');
    } else {
      failedElement.classList.remove("hide");
    }
  } catch (error) {
    console.error('Error during login:', error);
  }
}

// ----------- Room functions ---------

// --- '/'
async function createRoom() {
  var user_name = document.querySelector('.alignedForm.login input[name="username"]').value;
  var password = document.querySelector('.alignedForm.login input[name="password"]').value;
  const X_API_Key = localStorage.getItem('api_key');

  try {
    const response = await fetch('/api/rooms/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X_API_Key // From global
      }
    });

    const room = await response.json();
    console.log(room.name); // debug
    CURRENT_ROOM = room.id

    if (room){
      navigateTo(`/room/${CURRENT_ROOM}`)
    }

  } catch (error) {
    console.error('Error during createRoom:', error);
  }
}

async function displayRooms() {
  let rooms;
  try{
    const response = await fetch('/api/rooms', {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    rooms = await response.json();
  } catch (error) {
    console.error('Error during displayRooms:', error);
    return;
  }

  var roomList = document.body.querySelector(".roomList");
  roomList.innerHTML = '';
  const noRooms = document.querySelector('.noRooms');
  noRooms.classList.add("hide");

  if (rooms.length === 0 || ! Array.isArray(rooms)){ // empty list
    // display 'no room yet ... '
    noRooms.classList.remove("hide")
  } else {
    rooms.forEach(room => {
      const newRoomElement = document.createElement("a");
      newRoomElement.textContent = `${room.id}: ${room.name}`;
      newRoomElement.href = `#/room/${room.id}`; // Setting deep link
      newRoomElement.addEventListener('click', function(event) {
        event.preventDefault();
        navigateTo(`/room/${room.id}`);
      });
      roomList.appendChild(newRoomElement);

    });
  }
  return;
}


// -------------------------- PROFILE -----------------------------------
// --- '/profile'
async function updateCredential() {
  const X_API_Key = localStorage.getItem('api_key');
  try {
    const response = await fetch(`/api/user/credential`, {
      method: 'GET',
      headers: {
        'X-API-Key': X_API_Key
      }
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    user = await response.json();
    localStorage.setItem('user_name', user.name);
    localStorage.setItem('password', user.password);

  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
  return user;
}

// --- username
async function updateUserName() {
  const X_API_Key = localStorage.getItem('api_key');
  var new_user_name = document.querySelector('.auth input[name="username"]').value;

  try {
    const response = await fetch(`/api/user/name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X_API_Key
      },
      body: JSON.stringify({
        "user_name": new_user_name
      }),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    resp_message = await response.json();

    await updateCredential(); // update localStorage
    updateUserNameUI()

  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
  return;
}

async function updatePassword() {
  const X_API_Key = localStorage.getItem('api_key');
  var new_password = document.querySelector('.auth input[name="password"]').value;
  try {
    const response = await fetch(`/api/user/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X_API_Key
      },
      body: JSON.stringify({
        "password": new_password
      }),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    resp_message = await response.json();

    await updateCredential(); // update localStorage

  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
  return;
}


// -------------------------- ROOM -----------------------------------
// ------ '/room/<int>'
async function showRoom() {
  const X_API_Key = localStorage.getItem('api_key');
  let room;
  try {
    const response = await fetch(`/api/room/${CURRENT_ROOM}`, {
      method: 'GET',
      headers: {
        'X-API-Key': X_API_Key
      },
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    room = await response.json();
  } catch (error) {
    console.error('Error during showRoom:', error);
    return;
  }
  // update roomName
  const roomName = document.querySelector('.displayRoomName strong');
  roomName.textContent = room.name;

  const inviteLink = document.querySelector('#inviteLink');
  inviteLink.href = `/room/${room.id}`;
  inviteLink.textContent = `/room/${room.id}`;

  // first load
  getMessages();
}

async function updateRoomName() {
  console.log("update room name")
  var new_room_name = document.querySelector('.editRoomName input').value;
  const X_API_Key = localStorage.getItem('api_key');

  try {
    const response = await fetch(`/api/rooms/changename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X_API_Key
      },
      body: JSON.stringify({
        "room_id": CURRENT_ROOM,
        "new_room_name": new_room_name
      }),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    resp_message = await response.json();
    // console.log(resp_message);

    document.querySelector('.displayRoomName strong').textContent = new_room_name; // Update the display name instantly
    this.closest('.editRoomName').classList.add('hide');
    document.querySelector('.displayRoomName .material-symbols-outlined').classList.remove("hide");

  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
  return;
}

// -------- messages ----------
async function postMessage() {
  const X_API_Key = localStorage.getItem('api_key');

  const bodyValue = document.querySelector('textarea[name="comment"]').value;

  let new_message
  try {
    const response = await fetch(`/api/messages/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X_API_Key
      },
      body: JSON.stringify({
        "body": bodyValue,
        "room_id": CURRENT_ROOM,
      }),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    new_message = await response.json();
    console.log(new_message);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
  return;
}

async function getMessages() {
  const X_API_Key = localStorage.getItem('api_key');
  let messages;
  try {
    const response = await fetch(`/api/messages?room_id=${CURRENT_ROOM}`, {
      method: 'GET',
      headers: {
        'X-API-Key': X_API_Key
      },
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    messages = await response.json();
    console.log(messages); //debug
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }

  var resultsContainer = document.body.querySelector(".messages");

  // clear sample messages
  resultsContainer.innerHTML = '';

  if (! Array.isArray(messages)) {
    return;
  } else {
    messages.forEach(message => {
      // update a new message
      const newMsgClass = document.createElement("message");

      const authorElement = document.createElement("author");
      authorElement.textContent = message["user_name"];
      const contentElement = document.createElement("content");
      contentElement.textContent = message["body"];

      newMsgClass.appendChild(authorElement);
      newMsgClass.appendChild(contentElement);

      resultsContainer.appendChild(newMsgClass);
   });
  }
  return;
}

// -------- navigation ---------

// Function to navigate to a room
// https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#examples:~:text=in%20its%20hash.-,Examples,-This%20creates%20a
function navigateTo(path) {
  // Triggered by html onclick
  // stateObject : Whenever the user navigates to the new state, a popstate event is fired, and the state property of the event contains a copy of the history entry's state object.
  const stateObject = { path: path };
  console.log(`Navigating to ${path}`);

  // Use the History API to update the URL and push the new state to the history
  history.pushState(stateObject, '', path);
  window.dispatchEvent(new Event('popstate')); // SPA: Update to new url wo reloading
}


// -------- pages management --------
// On page load, show the appropriate page and hide the others

// show me a new "page"
let showOnly = (element) => {
  SPLASH.classList.add("hide");
  LOGIN.classList.add("hide");
  ROOM.classList.add("hide");
  PROFILE.classList.add("hide");

  element.classList.remove("hide");
}

let router = () => {
  let path = window.location.pathname;

  switch(true) { // switch is the same as if-else
    case path === "/":
      console.log("get / page");
      // show the index
      CURRENT_ROOM = 0;
      showOnly(SPLASH);
      break;
    case path === "/profile":
      // show the profile
      showOnly(PROFILE);
      break;
    case path.startsWith("/room"):
      showOnly(ROOM);
      const roomId = path.split("/")[2]; // This is a simple way to get the room ID
      console.log("Room ID:", roomId);

      CURRENT_ROOM = roomId;
      showRoom(); // load based on CURRENT_ROOM

      break;
    case path === "/login":
      showOnly(LOGIN);
      break;
    //else do 404
    default:
      console.log(`404 Page Not Found ${path}`);
      // Show 404 page or redirect to a default page
      break;
  }
}


// TODO : Make all HTTP requests after the page load with fetch calls to API endpoints that return JSON. Prefix API routes with /api. ??
// TODO : Opening /, /login, or /profile in a new browser window opens the app to those screens. ????

// ----------- UI ------------
// --------- Update {{Username}}
function updateUserNameUI() {
  var user_name = '';
  user_name = localStorage.getItem('user_name');
  const allUserNameUI = document.querySelectorAll('.username');
  allUserNameUI.forEach(element => {
    element.textContent = user_name;
  });
}

// --------- Toggle EditRoomIcon
function editRoomToggle() {

}


window.addEventListener("DOMContentLoaded", () => {
  updateUserNameUI();
  router();
  displayRooms();

  // edit room name toggle
  const editIcon = document.querySelector('.displayRoomName .material-symbols-outlined');
  const editroomname = document.querySelector('.editroomname');
  if (editIcon) {
    editIcon.addEventListener('click', () => {
      editroomname.classList.remove("hide");
      editIcon.classList.add("hide");
    });
  }
  const saveIcon = document.querySelector('.editroomname button');
  if (saveIcon) {
    saveIcon.addEventListener('click', updateRoomName);
  }

  setInterval(async () => {
    if (CURRENT_ROOM == 0) {
      return;
    }
    // poll messages
    console.log("polling");
    await getMessages();

  }, 500);


});

window.addEventListener('popstate', router);

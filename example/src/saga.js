import { eventChannel } from "redux-saga";
import { take, takeEvery, call, put } from "redux-saga/effects";

let uuid;

function sseChannel() {
  return eventChannel((emitter) => {

    // event source socket will be openened
    const es = new EventSource("/sse");
    es.onmessage = function (event) {
      try {
        const action = JSON.parse(event.data);
        // some voodoo to prevent feedback loops, this is not optimal, but hey, it works
        if (action.type && (!action.uuid || action.uuid !== uuid)) {
          // this is where an event is send forward
          emitter(action);
        } else if (action.uuid) {
          // here it is received by the client, and the uuid is set
          uuid = action.uuid;
        }
      } catch (e) {
        console.error(e);
      }
    };
    // unsubscribe function
    return () => {
      es.close();
    };
  });
}

// this saga listens to a channel which opens the event source connection
// any events emitted from the channel will be dispatched :D
function *sseSaga() {
  const channel = yield call(sseChannel);
  while (true) {
    const action = yield take(channel);
    yield put(action);
  }
}

function *dispatchToRemotes(action) {
  // yeah this is still messy, if there is no action.uuid, it means that it is
  // dispatched directly from the local client, which means we have to send
  // it to our server, which will send it down through the event source socket
  // to all other clients
  if (!action.uuid) {
    fetch("http://localhost:3000/sse-post", {
      method: "post",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(Object.assign({}, action, { uuid })) // yes, the uuid is send as well, the prevent feedback loops
    });
  }
}

// here we have our takes, these actions will be send to our server
function *takers() {
  yield takeEvery("ADD_FRAGMENT", dispatchToRemotes);
  yield takeEvery("UPDATE_FRAGMENT", dispatchToRemotes);
  yield takeEvery("UPDATE_ROUTE", dispatchToRemotes);
}

module.exports = {
  sseSaga,
  takers
};

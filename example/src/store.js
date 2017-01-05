import { createStore, applyMiddleware } from "redux";

// some sagas for added the event source socket
// and one for handling dispatched actions
import { sseSaga, takers } from "./saga";

// aha, here it is, redux-saga
import createSagaMiddleware from "redux-saga";

import reducer from "../../src/reducers";

const configureStore = () => {

  const sagaMiddleware = createSagaMiddleware();
  const createStoreWithMiddleware = applyMiddleware(sagaMiddleware)(createStore);
  const store = createStoreWithMiddleware(reducer);

  // run sagas
  // usual stuff, nothing special actually
  sagaMiddleware.run(sseSaga);
  sagaMiddleware.run(takers);

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept("../../src/reducers", () => {
      const nextReducer = require("../../src/reducers");
      store.replaceReducer(nextReducer);
    });
  }

  return store;
};

export default configureStore;

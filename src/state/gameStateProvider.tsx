import { createScopedStoreContext } from "@plasius/react-state";

type GameAction =
  | {
      type: "INCREMENT_SCORE";
      payload: number;
    }
  | {
      type: "SET_LEVEL";
      payload: number;
    }
  | {
      type: "TOGGLE_PAUSE";
    }
  | {
      type: "RESET_GAME";
    };

interface GameState {
  score: number;
  level: number;
  isPaused: boolean;
}

const initialState: GameState = {
  score: 0,
  level: 1,
  isPaused: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INCREMENT_SCORE":
      return { ...state, score: state.score + action.payload };
    case "SET_LEVEL":
      return { ...state, level: action.payload };
    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused };
    case "RESET_GAME":
      return { ...initialState };
    default:
      return state;
  }
}

export const GameStateStore = createScopedStoreContext<GameState, GameAction>(
  gameReducer,
  initialState
);

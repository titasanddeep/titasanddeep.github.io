
import { useCallback, useRef, useState } from "react";
import { initialStoryState, storyReducer, type StoryAction, type StoryState } from "../state/storyMachine";

/**
 * Reducer state that is also readable synchronously through a ref. Player event handlers (frameupdate fires every
 * frame) read the ref so they never act on a stale step right after a dispatch.
 */
export const useStoryMachine = () => {
  const ref = useRef<StoryState>(initialStoryState);
  const [state, setState] = useState<StoryState>(initialStoryState);

  const send = useCallback((action: StoryAction) => {
    const next = storyReducer(ref.current, action);
    if (next === ref.current) return;
    ref.current = next;
    setState(next);
  }, []);

  return { state, stateRef: ref, send };
};


import { ref } from 'vue'

export function useUndoRedo(initialState) {
    const currentState = ref(initialState)
    const history = ref([initialState.value])
    const historyIndex = ref(0)

    const canUndo = () => historyIndex.value > 0
    const canRedo = () => historyIndex.value < history.value.length - 1

    const addToHistory = (newState) => {
        if (newState !== currentState.value) {
            history.value = history.value.slice(0, historyIndex.value + 1)
            history.value.push(newState)
            historyIndex.value++
            currentState.value = newState
        }
    }

    const undo = () => {
        if (canUndo()) {
            historyIndex.value--
            currentState.value = history.value[historyIndex.value]
        }
    }

    const redo = () => {
        if (canRedo()) {
            historyIndex.value++
            currentState.value = history.value[historyIndex.value]
        }
    }

    return {
        currentState,
        undo,
        redo,
        canUndo,
        canRedo,
        addToHistory
    }
}
import { computed, ref, onUnmounted } from 'vue';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 100000;
const TOAST_TYPES = {
  success: {
    variant: 'success',
    title: 'Success',
    duration: 3000,
  },
  error: {
    variant: 'destructive',
    title: 'Error',
    duration: 3000,
  },
  warning: {
    variant: 'warning',
    title: 'Warning',
    duration: 3000,
  },
  info: {
    variant: 'default',
    title: 'Info',
    duration: 3000,
  }
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId));
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

const state = ref({
  toasts: [],
});

function dispatch(action) {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      state.value.toasts = [action.toast, ...state.value.toasts].slice(
        0,
        TOAST_LIMIT,
      );
      break;

    case actionTypes.UPDATE_TOAST:
      state.value.toasts = state.value.toasts.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t,
      );
      break;

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.value.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      state.value.toasts = state.value.toasts.map((t) =>
        t.id === toastId || toastId === undefined
          ? {
            ...t,
            open: false,
          }
          : t,
      );
      break;
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) state.value.toasts = [];
      else
        state.value.toasts = state.value.toasts.filter(
          (t) => t.id !== action.toastId,
        );

      break;
  }
}

function useToast() {
  const toasts = computed(() => state.value.toasts);

  try {
    onUnmounted(() => {
      toastTimeouts.forEach(clearTimeout);
      state.value.toasts = [];
    });
  } catch (e) {
    console.warn(
      "onUnmounted should be used within the setup() function. Lifecycle hooks might not work properly outside of setup()."
    );
  }

  return {
    toasts,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

function toast(options) {
  const id = genId();

  let toastOptions;
  if (typeof options === 'string') {
    toastOptions = {
      description: options,
      ...TOAST_TYPES.info, // Use a default safe type for string messages
    };
  } else {
    const { type = 'info', message, ...rest } = options;

    const validType = TOAST_TYPES.hasOwnProperty(type) ? type : 'info';

    toastOptions = {
      description: message,
      ...TOAST_TYPES[validType],
      ...rest,
    };
  }

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...toastOptions,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

export { toast, useToast };

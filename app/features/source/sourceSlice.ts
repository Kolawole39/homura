import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { channel } from '../../channel/child';
import { Mode } from '../../constants/Mode';
import { Preset } from '../../constants/Preset';
import type { AppThunk, RootState } from '../../store';

type SourceItem = {
  id: number;
  name: string;
  link: string;
  count: number;
  icon?: string;
};

type State = {
  list: SourceItem[];
  activeId: number | Preset | undefined;
  refreshing: boolean;
};

const initialState: State = {
  list: [],
  activeId: undefined,
  refreshing: false,
};

const sourceSlice = createSlice({
  name: 'source',
  initialState,
  reducers: {
    loadAll: (state, action: PayloadAction<SourceItem[]>) => {
      state.list = action.payload;
    },
    create: (state, action: PayloadAction<SourceItem>) => {
      const { id } = action.payload;
      state.list.push(action.payload);
      state.activeId = id;
    },
    setActiveId: (
      state,
      action: PayloadAction<number | Preset | undefined>
    ) => {
      state.activeId = action.payload;
    },
    countDownOne: (state, action: PayloadAction<number>) => {
      const target = state.list.find((x) => x.id === action.payload);
      if (!target) return;
      target.count -= 1;
    },
    countUpOne: (state, action: PayloadAction<number>) => {
      const target = state.list.find((x) => x.id === action.payload);
      if (!target) return;
      target.count += 1;
    },
    countToZero: (state, action: PayloadAction<number>) => {
      const target = state.list.find((x) => x.id === action.payload);
      if (!target) return;
      target.count = 0;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    updateName: (
      state,
      action: PayloadAction<{ id: number; name: string }>
    ) => {
      const target = state.list.find((x) => x.id === action.payload.id);
      if (!target) return;
      target.name = action.payload.name;
    },
    removeById: (state, action: PayloadAction<number>) => {
      state.list = state.list.filter((x) => x.id !== action.payload);
    },
  },
});

export const {
  loadAll,
  create,
  setActiveId,
  countDownOne,
  countUpOne,
  countToZero,
  setRefreshing,
  updateName,
  removeById,
} = sourceSlice.actions;

export const loadSource = (mode: Mode): AppThunk => async (dispatch) => {
  dispatch(setRefreshing(true));
  const countType = mode === Mode.Starred ? 'starred' : 'unread';
  const list = await channel.getSourceList(countType);

  const mappedList = list.map(({ id, name, link, count, icon }) => ({
    id,
    icon: icon === null ? undefined : icon,
    name,
    link,
    count,
  }));

  dispatch(loadAll(mappedList));
  dispatch(setRefreshing(false));
};

export const asyncRemoveById = (id: number): AppThunk => async (dispatch) => {
  await channel.removeSourceById(id);
  dispatch(setActiveId());
  dispatch(removeById(id));
};

export const asyncUpdateName = (id: number, name: string): AppThunk => async (
  dispatch
) => {
  await channel.updateSourceNameById(id, name);
  dispatch(setActiveId());
  dispatch(updateName({ id, name }));
};

export const sync = (): AppThunk => async (dispatch, getState) => {
  dispatch(setRefreshing(true));
  await channel.sync();
  const { mode } = getState();
  await dispatch(loadSource(mode));
  dispatch(setRefreshing(false));
};

export const sourceReducer = sourceSlice.reducer;

export const selectSource = (state: RootState) => {
  const { source, mode } = state;
  const totalCount = source.list.reduce((acc, cur) => acc + cur.count, 0);
  const { list, activeId } = source;

  return {
    activeId,
    totalCount,
    mode,
    list: list.filter((x) => {
      if (mode === Mode.All) return true;
      if (activeId === x.id) return true;
      return x.count > 0;
    }),
  };
};

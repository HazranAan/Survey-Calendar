import { api } from "./api";

export type RandomUser = {
  name: { first: string; last: string };
  picture: { thumbnail: string; medium: string; large: string };
};

export async function fetchRandomUsers(count = 6) {
  const res = await api.get<{ results: RandomUser[] }>(
    `https://randomuser.me/api/?results=${count}`
  );
  return res.data.results;
}

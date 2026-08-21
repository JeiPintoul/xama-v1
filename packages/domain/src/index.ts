export type Channel = Readonly<{
  id: string;
  name: string;
  description: string;
}>;

export type Community = Readonly<{
  id: string;
  name: string;
  description: string;
  channels: readonly Channel[];
}>;

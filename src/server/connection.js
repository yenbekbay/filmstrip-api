/* @flow */

const connectionForType = (type: string) => `
type ${type}Connection {
  nodes: [${type}!]!
  pageInfo: PageInfo!
}
`;

const nodesToConnection = (
  { nodes, count, offset, limit }: {
    nodes: Array<any>,
    count: number,
    offset: number,
    limit: number,
  },
) => {
  const pageCount = nodes.length;

  return {
    nodes,
    pageInfo: {
      hasPreviousPage: offset >= limit,
      hasNextPage: (offset + pageCount) < count,
    },
  };
};

export { connectionForType, nodesToConnection };

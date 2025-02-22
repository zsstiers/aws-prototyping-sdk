/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as fs from "fs-extra";
import * as testUtils from "./test-utils";
import { CdkGraph, getConstructUUID, Graph, NodeTypeEnum } from "../../src";
import { FixtureApp, MultiFixtureApp, StagedApp } from "../__fixtures__/apps";

const makeCdkOutdir = async (name: string) =>
  testUtils.makeCdkOutDir("compute", name);

describe("cdk-graph/compute", () => {
  describe("single-stack-app", () => {
    let outdir: string;
    let graphJsonFile: string;
    let app: FixtureApp;
    let graph: CdkGraph;

    beforeAll(async () => {
      outdir = await makeCdkOutdir("single-stack-app");

      app = new FixtureApp({ outdir });
      graph = new CdkGraph(app);
      app.synth();
      graphJsonFile = graph.graphContext!.graphJson.filepath;
    });

    it("should synthesize graph.json", async () => {
      expect(await fs.pathExists(graphJsonFile)).toBe(true);
    });

    it("should serialize <-> deserialize to same", async () => {
      const serializedStore = await fs.readJSON(graphJsonFile, {
        encoding: "utf-8",
      });
      const deserializedStore =
        Graph.Store.fromSerializedStore(serializedStore);
      const reserializedStore = deserializedStore.serialize();
      expect(serializedStore).toEqual(reserializedStore);
    });

    it("should graph references and dependencies", () => {
      const bucketNode = graph.graphContext?.store.getNode(
        getConstructUUID(app.stack.dataLayer.bucket)
      ) as Graph.ResourceNode;
      expect(bucketNode).toBeInstanceOf(Graph.ResourceNode);
      const cfnBucketNode = bucketNode.cfnResource!;
      expect(cfnBucketNode).toBeInstanceOf(Graph.CfnResourceNode);

      const lambdaNode = graph.graphContext?.store.getNode(
        getConstructUUID(app.stack.apiLayer.helloHandler)
      ) as Graph.ResourceNode;
      expect(lambdaNode).toBeInstanceOf(Graph.ResourceNode);
      const cfnLambdaNode = lambdaNode.cfnResource!;
      expect(cfnLambdaNode).toBeInstanceOf(Graph.CfnResourceNode);

      const roleNode = graph.graphContext?.store.getNode(
        getConstructUUID(app.stack.dataLayer.readRole)
      ) as Graph.ResourceNode;
      expect(roleNode).toBeInstanceOf(Graph.ResourceNode);
      const cfnRoleNode = roleNode.cfnResource!;
      expect(cfnRoleNode).toBeInstanceOf(Graph.CfnResourceNode);

      expect(cfnLambdaNode.doesReference(cfnBucketNode)).toBeTruthy();
    });
  });

  describe("multi-stack-app", () => {
    let outdir: string;
    let graphJsonFile: string;
    let app: MultiFixtureApp;
    let graph: CdkGraph;
    let store: Graph.Store;

    beforeAll(async () => {
      outdir = await makeCdkOutdir("multi-stack-app");

      app = new MultiFixtureApp({ outdir });
      graph = new CdkGraph(app);
      app.synth();
      store = graph.graphContext!.store;
      graphJsonFile = graph.graphContext!.graphJson.filepath;
    });

    it("should synthesize graph.json", async () => {
      expect(await fs.pathExists(graphJsonFile)).toBe(true);
    });

    it("should serialize <-> deserialize to same", async () => {
      const serializedStore = await fs.readJSON(graphJsonFile, {
        encoding: "utf-8",
      });
      const deserializedStore =
        Graph.Store.fromSerializedStore(serializedStore);
      const reserializedStore = deserializedStore.serialize();
      expect(serializedStore).toEqual(reserializedStore);
    });

    it("should graph references and dependencies", () => {
      const bucketNode = store.getNode(
        getConstructUUID(app.stack.dataLayer.bucket)
      ) as Graph.ResourceNode;
      expect(bucketNode).toBeInstanceOf(Graph.ResourceNode);
      const cfnBucketNode = bucketNode.cfnResource!;
      expect(cfnBucketNode).toBeInstanceOf(Graph.CfnResourceNode);

      const lambdaNode1 = store.getNode(
        getConstructUUID(app.stack.apiLayer.helloHandler)
      ) as Graph.ResourceNode;
      expect(lambdaNode1).toBeInstanceOf(Graph.ResourceNode);
      const cfnLambdaNode1 = lambdaNode1.cfnResource!;
      expect(cfnLambdaNode1).toBeInstanceOf(Graph.CfnResourceNode);
      expect(cfnLambdaNode1.doesReference(cfnBucketNode)).toBeTruthy();

      const lambdaNode2 = store.getNode(
        getConstructUUID(app.dependentStack.lambda)
      ) as Graph.ResourceNode;
      expect(lambdaNode2).toBeInstanceOf(Graph.ResourceNode);
      const cfnLambdaNode2 = lambdaNode2.cfnResource!;
      expect(cfnLambdaNode2).toBeInstanceOf(Graph.CfnResourceNode);
      expect(cfnLambdaNode2.doesReference(cfnBucketNode)).toBeTruthy();

      const roleNode2 = store.getNode(
        getConstructUUID(app.dependentStack.role)
      ) as Graph.ResourceNode;
      expect(roleNode2).toBeInstanceOf(Graph.ResourceNode);
      const cfnRoleNode2 = roleNode2.cfnResource!;
      expect(cfnRoleNode2).toBeInstanceOf(Graph.CfnResourceNode);
      expect(cfnRoleNode2.doesReference(cfnBucketNode));
      expect(cfnRoleNode2.doesReference(cfnLambdaNode1));
      expect(cfnRoleNode2.doesReference(cfnLambdaNode2));
    });
  });

  describe("staged-app", () => {
    let outdir: string;
    let graphJsonFile: string;
    let app: StagedApp;
    let graph: CdkGraph;
    let store: Graph.Store;

    beforeAll(async () => {
      outdir = await makeCdkOutdir("staged-app");

      app = new StagedApp({ outdir });
      graph = new CdkGraph(app);
      app.synth();
      store = graph.graphContext!.store;
      graphJsonFile = graph.graphContext!.graphJson.filepath;
    });

    it("should synthesize graph.json", async () => {
      expect(await fs.pathExists(graphJsonFile)).toBe(true);
    });

    it("should serialize <-> deserialize to same", async () => {
      const serializedStore = await fs.readJSON(graphJsonFile, {
        encoding: "utf-8",
      });
      const deserializedStore =
        Graph.Store.fromSerializedStore(serializedStore);
      const reserializedStore = deserializedStore.serialize();
      expect(serializedStore).toEqual(reserializedStore);
    });

    it("should have 3 stages with matching stacks", () => {
      const stages = store.stages;
      expect(stages).toHaveLength(3);

      const [stage1, stage2, stage3] = stages;
      const stage1Nodes = stage1.findAll();
      const stage2Nodes = stage2.findAll();
      const stage3Nodes = stage3.findAll();
      const len = stage1Nodes.length;

      function compareNode(a: Graph.Node, b: Graph.Node) {
        expect(a.nodeType).toEqual(b.nodeType);
        if (
          a.nodeType !== NodeTypeEnum.OUTPUT &&
          !a.path.includes("/ApiPermission.")
        ) {
          expect(a.id).toEqual(b.id);
          expect(a.path.replace(/^\w+\//, "")).toEqual(
            b.path.replace(/^\w+\//, "")
          );
        }
      }

      // skip first which is the stage
      for (let i = 1; i < len; i++) {
        compareNode(stage1Nodes[i], stage2Nodes[i]);
        compareNode(stage1Nodes[i], stage3Nodes[i]);
      }
    });
  });
});

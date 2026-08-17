import { prisma } from "../src/client";
async function main() {
  await prisma.verifierProfile.upsert({
    where: { id: "prooflayer-fixture-01" },
    update: {},
    create: { id: "prooflayer-fixture-01", operatorAddress: "0x0000000000000000000000000000000000000001", manifestHash: "fixture-manifest", pipelineVersion: "fixture-solar-v1", policyVersion: "solar_installation_completed_v1" },
  });
}
main().finally(() => prisma.$disconnect());

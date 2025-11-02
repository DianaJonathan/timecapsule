import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployTimeCapsule: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("TimeCapsule", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

deployTimeCapsule.tags = ["TimeCapsule"];

export default deployTimeCapsule;

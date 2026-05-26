import chalk from "chalk";
import ora from "ora";

export function createSpinner(text) {
  return ora({ text }).start();
}

export const logger = {
  info: (message) => console.log(chalk.cyan(message)),
  success: (message) => console.log(chalk.green(message)),
  warn: (message) => console.log(chalk.yellow(message)),
  error: (message) => console.log(chalk.red(message)),
};

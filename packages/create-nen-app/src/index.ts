import { Command } from 'commander';
import prompts from 'prompts';
import pc from 'picocolors';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
  .name('create-nen-app')
  .description('Scaffold a Next.js app with Nen pre-configured')
  .argument('[project-directory]', 'The name of the project')
  .action(async (projectDirectory) => {
    let targetDir = projectDirectory;

    if (!targetDir) {
      const response = await prompts({
        type: 'text',
        name: 'dir',
        message: 'What is your project named?',
        initial: 'my-nen-app',
      });
      targetDir = response.dir;
    }

    if (!targetDir) {
      console.log(pc.red('Please specify the project directory.'));
      process.exit(1);
    }

    console.log(`\nCreating a new Nen app in ${pc.green(targetDir)}.\n`);

    try {
      // Step 1: Scaffold Next.js
      console.log(pc.blue('Scaffolding Next.js app...'));
      execSync(`npx create-next-app@latest ${targetDir} --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`, { stdio: 'inherit' });

      // Step 2: Install dependencies
      console.log(pc.blue('\nInstalling Nen dependencies...'));
      const projectPath = path.resolve(process.cwd(), targetDir);
      
      // We assume @withnen/client and @withnen/server are published.
      // For local development, this needs to be linked.
      execSync(`npm install @withnen/client @withnen/server`, { cwd: projectPath, stdio: 'inherit' });

      // Step 3: Add basic templates
      console.log(pc.blue('\nAdding Nen templates...'));
      
      const apiDir = path.join(projectPath, 'src', 'app', 'api', 'nen', 'handshake');
      fs.mkdirSync(apiDir, { recursive: true });

      const apiRouteCode = `
import { handleHandshake, InMemorySessionStore, setSessionStore } from '@withnen/server';

// Initialize session store (use RedisSessionStore in production)
setSessionStore(new InMemorySessionStore());

export async function POST(req: Request) {
  return handleHandshake(req);
}
`;
      fs.writeFileSync(path.join(apiDir, 'route.ts'), apiRouteCode.trim());

      console.log(pc.green('\nSuccess! Created a new Nen app.'));
      console.log(`Inside that directory, you can run:\n`);
      console.log(pc.cyan(`  cd ${targetDir}`));
      console.log(pc.cyan(`  npm run dev`));
      console.log(`\nEnjoy highly secure, quantum-resistant communication!`);
      
    } catch (e) {
      console.error(pc.red('\nFailed to create project.'), e);
      process.exit(1);
    }
  });

program.parse(process.argv);

const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('Usage: node gen-module.js <module-name>');
  process.exit(1);
}

const baseDir = path.join(__dirname, '..', 'apps', 'api', 'src', 'modules', moduleName);
const dtoDir = path.join(baseDir, 'dto');

if (fs.existsSync(baseDir)) {
  console.error(`Error: Module ${moduleName} already exists.`);
  process.exit(1);
}

// Ensure directories exist
fs.mkdirSync(dtoDir, { recursive: true });

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const camelCase = (s) => s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
const className = capitalize(camelCase(moduleName));

// 1. Module
const moduleContent = `import { Module } from '@nestjs/common';
import { ${className}Controller } from './${moduleName}.controller';
import { ${className}Service } from './${moduleName}.service';
import { ${className}Repository } from './${moduleName}.repository';

@Module({
  controllers: [${className}Controller],
  providers: [${className}Service, ${className}Repository],
  exports: [${className}Service],
})
export class ${className}Module {}
`;

// 2. Controller
const controllerContent = `import { Controller } from '@nestjs/common';
import { ${className}Service } from './${moduleName}.service';

@Controller('${moduleName}')
export class ${className}Controller {
  constructor(private readonly ${camelCase(moduleName)}Service: ${className}Service) {}
}
`;

// 3. Service
const serviceContent = `import { Injectable } from '@nestjs/common';
import { ${className}Repository } from './${moduleName}.repository';

@Injectable()
export class ${className}Service {
  constructor(private readonly repository: ${className}Repository) {}
  
  // Implement logic according to SDD section 4.2
}
`;

// 4. Repository
const repositoryContent = `import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';

@Injectable()
export class ${className}Repository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}
}
`;

// Write files
fs.writeFileSync(path.join(baseDir, `${moduleName}.module.ts`), moduleContent);
fs.writeFileSync(path.join(baseDir, `${moduleName}.controller.ts`), controllerContent);
fs.writeFileSync(path.join(baseDir, `${moduleName}.service.ts`), serviceContent);
fs.writeFileSync(path.join(baseDir, `${moduleName}.repository.ts`), repositoryContent);

console.log(`✅ Module ${moduleName} generated successfully at apps/api/src/modules/${moduleName}`);

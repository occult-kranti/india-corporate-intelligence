import { INVESTIGATION_REGISTRY } from './investigation';
import { INVESTIGATION_CASES } from './investigations';
import { assembleResearchProgram } from './researchProgramSchema';

export const RESEARCH_PROGRAM_FILES = ['political-funding.json', 'resources-welfare.json', 'justice-procurement.json', 'proven-cases.json', 'methods.json'];
const modules = import.meta.glob('../../research/investigation-program/*.json', { eager: true, import: 'default' });
const inputs = Object.fromEntries(Object.entries(modules).filter(([path]) => RESEARCH_PROGRAM_FILES.includes(path.split('/').pop()!)));
export const RESEARCH_PROGRAM = assembleResearchProgram(inputs, {
  resolvedEntityIds: INVESTIGATION_REGISTRY.entities.filter(entity => entity.resolved === true).map(entity => entity.id),
  existingCases: INVESTIGATION_CASES,
});
export const MISSING_PROGRAM_FILES = RESEARCH_PROGRAM_FILES.filter(file => !Object.keys(inputs).some(path => path.endsWith(`/${file}`)));

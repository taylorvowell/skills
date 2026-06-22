Create or modify a component. Before doing ANYTHING:

1. Read components/REGISTRY.md completely
2. Check if this component or something similar already exists
3. If it exists: use it or add a variant. Tell me what you found and what you're reusing.
4. If it doesn't exist: tell me which primitives from the registry you'll compose it from
5. Wait for my approval before creating the file

When creating:
- Use CVA for any visual variants
- Import cn from @/lib/utils
- Build from shadcn primitives in the registry
- Place in components/[domain]/ (never in app/ or components/ui/)
- Named export, props interface above component
- After creation: update components/REGISTRY.md with the new entry

When modifying:
- Add variants to existing CVA config — do not duplicate the component
- After modification: update components/REGISTRY.md if variants changed

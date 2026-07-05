this skill is mostly for coss ui and shadcn ui for complement ing and making some of the best dashboards like cloudflare, Cal.com, dub.co

we'll mostly focus on 

- Creating clean, maintainable UI components
- Building responsive, accessible dashboards
- Following shadcn/ui patterns and best practices

## what no to do:
1. Over-abstract components with complex HOCs or render props
2. Write monolithic components with mixed concerns
3. Ignore accessibility (a11y) requirements
4. Duplicate code instead of extracting reusable components
5. you over write things when you produce the code, the end user feels it's too much cluttered and feels overwhelmed, so try to keep things as visuals, and avoid unnecessary complexity and over explaning with text


## writing better code for readability

1. don't abstract everything /referances/writing-better-code-for-readability.md
2. use semantic HTML and ARIA roles
3. handle loading states gracefully
4. implement proper error boundaries, basically every feedback should be shown gracefully for the end user and a good log needs to written for dev, no production (not exactly everytime, but making sure it should leak our code implmentations or sensitive info)
5. document complex logic clearly
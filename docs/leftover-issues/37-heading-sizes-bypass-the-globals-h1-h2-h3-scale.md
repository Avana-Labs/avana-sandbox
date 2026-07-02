# Heading sizes bypass the globals h1/h2/h3 scale

**Priority:** LOW · **Area:** ui

Action stages use arbitrary `text-[1.375rem]` / `text-[21px]` for section headings instead of the `h1/h2/h3` + `text-ui-*` scale in `app/globals.css`. Route headings through the defined scale.

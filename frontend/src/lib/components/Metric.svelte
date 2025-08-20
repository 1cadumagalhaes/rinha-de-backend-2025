<script lang="ts">
  export let label: string;
  export let value: any;
  export let description: string | undefined;
  export let valueClass: string = "";
</script>

<div class="flex flex-col">
  <div class="text-sm text-muted">{label}</div>
  <div class={`font-semibold ${valueClass}`} title={description}>{value}</div>
</div>
